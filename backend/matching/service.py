import logging
import math

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Doacao, LogAFD, ONG, ScoreMatching, StatusDoacao, Urgencia
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
    mn = min(valores)
    mx = max(valores)
    if mx == mn:
        return [1.0] * len(valores)
    return [(v - mn) / (mx - mn) for v in valores]


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

    demandas = [DemandPredictor.predict_demand(ong.id) for ong in ongs]
    distancias = [haversine(doacao_lat, doacao_lon, ong.latitude, ong.longitude) for ong in ongs]

    demandas_norm = _normalize(demandas)
    distancias_norm = _normalize(distancias)

    await db.execute(
        delete(ScoreMatching).where(ScoreMatching.doacao_id == doacao_id)
    )

    scores: list[tuple[ONG, float, float, float, float]] = []
    for i, ong in enumerate(ongs):
        score = (
            0.4 * urgencia_peso
            + 0.4 * demandas_norm[i]
            - 0.2 * distancias_norm[i]
        )
        scores.append((ong, urgencia_peso, demandas_norm[i], distancias_norm[i], score))
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

    for ong, up, dp, dip, sf in scores:
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

    melhor_ong, _, _, _, melhor_score = max(scores, key=lambda x: x[4])
    doacao.ong_matched_id = melhor_ong.id
    doacao.score_matching = round(melhor_score, 4)
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
        "[Matching] Doacao %s: analisado -> matched (ONG %s, score=%.4f)",
        doacao_id,
        melhor_ong.id,
        melhor_score,
    )

    doacao.status = StatusDoacao.notificado
    db.add(
        LogAFD(
            doacao_id=doacao_id,
            estado_anterior=StatusDoacao.matched.value,
            estado_novo=StatusDoacao.notificado.value,
            descricao=f"ONG {melhor_ong.id} notificada (simulacao)",
        )
    )
    logger.info(
        "[Matching] Doacao %s: matched -> notificado (ONG %s notificada)",
        doacao_id,
        melhor_ong.id,
    )

    await db.commit()
    logger.info("[Matching] Finalizado para doacao %s", doacao_id)
