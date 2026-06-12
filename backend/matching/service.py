import logging
import math

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.models import Doacao, HistoricoAtendimento, LogAFD, ONG, ScoreMatching, StatusDoacao, Urgencia
from ml.demand_predictor import DemandPredictor

logger = logging.getLogger(__name__)

URGENCY_WEIGHTS = {
    Urgencia.baixa: 0.25,
    Urgencia.media: 0.50,
    Urgencia.alta: 0.75,
    Urgencia.critica: 1.00,
}


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _normalize(valores: list[float]) -> list[float]:
    if not valores:
        return []
    mn = min(valores)
    mx = max(valores)
    if mx == mn:
        return [1.0] * len(valores)
    return [(v - mn) / (mx - mn) for v in valores]


async def compute_matching_preview(
    db: AsyncSession,
    tipo_alimento: str,
    categoria: str,
    quantidade: float,
    unidade_medida: str,
    latitude: float | None,
    longitude: float | None,
    urgencia: Urgencia | None = None,
) -> dict:
    """Calcula o matching sem persistir. Retorna dict com a melhor ONG.

    Usado pelo endpoint /doacoes/preview-matching para mostrar preview
    na Etapa 3 do cadastro, ANTES do doador confirmar e publicar.
    Reusa exatamente o mesmo algoritmo de calcular_matching(), só não
    grava em Doacao/ScoreMatching/LogAFD.
    """
    result = await db.execute(
        select(ONG).options(selectinload(ONG.usuario))
    )
    ongs = list(result.scalars().all())

    if not ongs:
        logger.info("[MatchingPreview] Nenhuma ONG disponivel")
        return {
            "ong_id": None,
            "ong_nome": None,
            "score": None,
            "distancia_km": None,
            "total_ongs_avaliadas": 0,
            "gps_usado_fallback": False,
        }

    # urgencia_peso usa o default 0.25 (igual matching real) se urgencia for None.
    # Front pode passar a urgencia predita pra preview mais fiel.
    if urgencia is not None:
        urgencia_peso = URGENCY_WEIGHTS.get(urgencia, 0.25)
    else:
        # Estimativa simples: se a categoria é perecível, considera 'media' (0.5).
        categoria_lower = (categoria or "").lower()
        pereciveis = {"laticinio", "laticínio", "carne", "peixe", "fruta", "verdura", "legume"}
        urgencia_peso = 0.50 if categoria_lower in pereciveis else 0.25

    gps_fallback = False
    if latitude is None or longitude is None:
        logger.warning(
            "[MatchingPreview] GPS indisponivel, usando (0.0, 0.0) para preview"
        )
        latitude = 0.0
        longitude = 0.0
        gps_fallback = True

    # Historico real de atendimento (mesma logica do matching real)
    demandas: list[float] = []
    for ong in ongs:
        result = await db.execute(
            select(HistoricoAtendimento.quantidade_atendida)
            .where(HistoricoAtendimento.ong_id == ong.id)
            .order_by(HistoricoAtendimento.semana.desc())
            .limit(4)
        )
        valores = [r[0] for r in result.all()]
        if len(valores) >= 2:
            demandas.append(sum(valores) / len(valores))
        else:
            demandas.append(DemandPredictor.predict_demand(ong.id))

    distancias = [haversine(latitude, longitude, ong.latitude, ong.longitude) for ong in ongs]

    demandas_norm = _normalize(demandas)
    distancias_norm = _normalize(distancias)

    scores: list[tuple[ONG, float, float, float, float, float]] = []
    for i, ong in enumerate(ongs):
        score = (
            0.4 * urgencia_peso
            + 0.4 * demandas_norm[i]
            - 0.2 * distancias_norm[i]
        )
        scores.append((ong, urgencia_peso, demandas_norm[i], distancias[i], distancias_norm[i], score))

    melhor_ong, _, _, distancia_km, _, melhor_score = max(scores, key=lambda x: x[5])
    score_0_100 = round(melhor_score * 100, 2)
    # ONG nao tem coluna 'nome' propria — pega do Usuario vinculado
    ong_nome = melhor_ong.usuario.nome if melhor_ong.usuario else None

    logger.info(
        "[MatchingPreview] Melhor: ONG %s (%s), score=%.2f, dist=%.1fkm (avaliadas=%d, gps_fallback=%s)",
        melhor_ong.id,
        ong_nome,
        score_0_100,
        distancia_km,
        len(ongs),
        gps_fallback,
    )

    return {
        "ong_id": melhor_ong.id,
        "ong_nome": ong_nome,
        "score": score_0_100,
        "distancia_km": round(distancia_km, 2),
        "total_ongs_avaliadas": len(ongs),
        "gps_usado_fallback": gps_fallback,
    }


async def calcular_matching(doacao_id: int, db: AsyncSession) -> None:
    logger.info("[Matching] Iniciando para doacao %s", doacao_id)

    result = await db.execute(select(Doacao).where(Doacao.id == doacao_id))
    doacao = result.scalar_one_or_none()
    if doacao is None:
        logger.warning("[Matching] Doacao %s nao encontrada", doacao_id)
        return

    if doacao.status != StatusDoacao.analisado:
        logger.warning(
            "[Matching] Doacao %s ja esta no estado '%s'. Ignorando.",
            doacao_id,
            doacao.status.value,
        )
        return

    logger.info(
        "[Matching] Doacao %s: tipo=%s, urgencia=%s, lat=%s, lon=%s",
        doacao_id,
        doacao.tipo_alimento,
        doacao.urgencia.value,
        doacao.latitude,
        doacao.longitude,
    )

    result = await db.execute(select(ONG))
    ongs = list(result.scalars().all())

    if not ongs:
        logger.warning(
            "[Matching] Nenhuma ONG disponivel. Doacao %s mantida como 'analisado'.",
            doacao_id,
        )
        return

    logger.info("[Matching] %d ONG(s) encontrada(s)", len(ongs))

    doacao_lat = doacao.latitude or 0.0
    doacao_lon = doacao.longitude or 0.0
    if doacao.latitude is None or doacao.longitude is None:
        logger.warning(
            "[Matching] GPS indisponivel para doacao %s, usando (0.0, 0.0)",
            doacao_id,
        )

    urgencia_peso = URGENCY_WEIGHTS.get(doacao.urgencia, 0.25)

    # Busca historico real de atendimento (se houver)
    demandas: list[float] = []
    for ong in ongs:
        result = await db.execute(
            select(HistoricoAtendimento.quantidade_atendida)
            .where(HistoricoAtendimento.ong_id == ong.id)
            .order_by(HistoricoAtendimento.semana.desc())
            .limit(4)
        )
        valores = [r[0] for r in result.all()]
        if len(valores) >= 2:
            demandas.append(sum(valores) / len(valores))
            logger.info("Demanda ONG %s: %.1f (historico real, n=%d)", ong.id, demandas[-1], len(valores))
        else:
            demandas.append(DemandPredictor.predict_demand(ong.id))
            logger.info("Demanda ONG %s: %.1f (modelo/fallback)", ong.id, demandas[-1])
    distancias = [haversine(doacao_lat, doacao_lon, ong.latitude, ong.longitude) for ong in ongs]

    demandas_norm = _normalize(demandas)
    distancias_norm = _normalize(distancias)

    await db.execute(
        delete(ScoreMatching).where(ScoreMatching.doacao_id == doacao_id)
    )

    scores: list[tuple[ONG, float, float, float, float, float]] = []
    for i, ong in enumerate(ongs):
        score = (
            0.4 * urgencia_peso
            + 0.4 * demandas_norm[i]
            - 0.2 * distancias_norm[i]
        )
        scores.append((ong, urgencia_peso, demandas_norm[i], distancias[i], distancias_norm[i], score))
        logger.info(
            "[Matching] ONG %s: urgencia=%.2f demanda=%.2f(norm) "
            "dist=%.1fkm=%.2f(norm) -> score=%.4f",
            ong.id,
            urgencia_peso,
            demandas_norm[i],
            distancias[i],
            distancias_norm[i],
            score,
        )

    for ong, up, dp, dkm, dip, sf in scores:
        db.add(
            ScoreMatching(
                doacao_id=doacao_id,
                ong_id=ong.id,
                urgencia_peso=up,
                demanda_peso=dp,
                distancia_peso=dip,
                score_final=sf,
            )
        )

    melhor_ong, _, _, distancia_km, _, melhor_score = max(scores, key=lambda x: x[5])
    doacao.ong_matched_id = melhor_ong.id
    doacao.score_matching = round(melhor_score * 100, 2)  # Escala 0-100
    doacao.distancia_km = round(distancia_km, 2)
    doacao.status = StatusDoacao.matched

    db.add(
        LogAFD(
            doacao_id=doacao_id,
            estado_anterior=StatusDoacao.analisado.value,
            estado_novo=StatusDoacao.matched.value,
            descricao=f"Matching calculado: ONG {melhor_ong.id} selecionada (score={melhor_score:.4f})",
        )
    )
    logger.info(
        "[Matching] Doacao %s: analisado -> matched (ONG %s, score=%.4f). "
        "Aguardando acao manual da ONG para reservar (status=notificado).",
        doacao_id,
        melhor_ong.id,
        melhor_score,
    )

    await db.commit()
    logger.info("[Matching] Finalizado para doacao %s", doacao_id)
