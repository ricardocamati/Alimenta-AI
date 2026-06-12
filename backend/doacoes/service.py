import logging
from datetime import date, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.models import Doacao, LogAFD, ONG, StatusDoacao, Urgencia, Usuario, HistoricoAtendimento
from doacoes.schemas import DoacaoCreate
from ml.predictor import UrgencyPredictor

logger = logging.getLogger(__name__)


async def _resolve_gps_doacao(
    db: AsyncSession,
    payload: DoacaoCreate,
    doador_id: int,
) -> tuple[float | None, float | None]:
    """Tenta obter lat/lon do payload, do doador ou via geocoding do endereco."""
    if payload.latitude is not None and payload.longitude is not None:
        return payload.latitude, payload.longitude

    # Tenta pegar do doador
    result = await db.execute(select(Usuario).where(Usuario.id == doador_id))
    doador = result.scalar_one_or_none()
    if doador and doador.latitude is not None and doador.longitude is not None:
        logger.info("Usando GPS do doador %s: %s, %s", doador_id, doador.latitude, doador.longitude)
        return doador.latitude, doador.longitude

    # Tenta geocodificar o endereco do doador
    if doador and doador.endereco:
        from matching.geocoding import geocode_address
        coords = await geocode_address(doador.endereco)
        if coords:
            lat, lon = coords
            # Persiste no usuario para evitar geocoding repetido
            doador.latitude = lat
            doador.longitude = lon
            logger.info("Geocodificado endereco do doador %s: %s, %s", doador_id, lat, lon)
            return lat, lon
        else:
            logger.warning("Falha ao geocodificar endereco do doador %s: %s", doador_id, doador.endereco)

    return None, None


async def criar_doacao(
    db: AsyncSession, payload: DoacaoCreate, doador_id: int
) -> Doacao:
    lat, lon = await _resolve_gps_doacao(db, payload, doador_id)

    doacao = Doacao(
        doador_id=doador_id,
        tipo_alimento=payload.tipo_alimento,
        categoria=payload.categoria,
        quantidade=payload.quantidade,
        unidade_medida=payload.unidade_medida or "kg",
        data_validade=payload.data_validade,
        foto_url=payload.foto_url,
        latitude=lat,
        longitude=lon,
        status=StatusDoacao.cadastrado,
    )
    db.add(doacao)
    await db.flush()

    log = LogAFD(
        doacao_id=doacao.id,
        estado_anterior="",
        estado_novo=StatusDoacao.cadastrado.value,
        descricao="Doacao cadastrada pelo doador",
    )
    db.add(log)
    logger.info("Doacao %s cadastrada pelo doador %s", doacao.id, doador_id)

    dias_ate_vencimento = (payload.data_validade - date.today()).days
    logger.info(
        "Doacao %s: dias_ate_vencimento=%s (validade=%s)",
        doacao.id,
        dias_ate_vencimento,
        payload.data_validade,
    )

    urgencia_predita = UrgencyPredictor.predict(
        tipo_alimento=payload.tipo_alimento,
        categoria=payload.categoria,
        dias_ate_vencimento=dias_ate_vencimento,
    )

    try:
        doacao.urgencia = Urgencia(urgencia_predita)
    except ValueError:
        logger.warning(
            "Doacao %s: urgencia '%s' invalida, usando 'baixa'",
            doacao.id,
            urgencia_predita,
        )
        doacao.urgencia = Urgencia.baixa

    doacao.status = StatusDoacao.analisado
    log_transicao = LogAFD(
        doacao_id=doacao.id,
        estado_anterior=StatusDoacao.cadastrado.value,
        estado_novo=StatusDoacao.analisado.value,
        descricao="Analise de urgencia realizada pelo motor de ML",
    )
    db.add(log_transicao)
    logger.info(
        "Doacao %s: transicao cadastrado -> analisado (urgencia=%s)",
        doacao.id,
        doacao.urgencia.value,
    )

    await db.commit()
    await db.refresh(doacao)
    # Eager-load para serializacao Pydantic (evita MissingGreenlet)
    result = await db.execute(
        select(Doacao)
        .options(selectinload(Doacao.doador), selectinload(Doacao.logs))
        .where(Doacao.id == doacao.id)
    )
    return result.scalar_one()


async def listar_doacoes(
    db: AsyncSession, doador_id: int, limit: int, offset: int
) -> list[Doacao]:
    result = await db.execute(
        select(Doacao)
        .options(selectinload(Doacao.logs), selectinload(Doacao.doador))
        .where(Doacao.doador_id == doador_id)
        .order_by(Doacao.criado_em.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def buscar_doacao_por_id(
    db: AsyncSession, doacao_id: int, doador_id: int
) -> Doacao | None:
    result = await db.execute(
        select(Doacao)
        .options(selectinload(Doacao.logs), selectinload(Doacao.doador))
        .where(Doacao.id == doacao_id, Doacao.doador_id == doador_id)
    )
    return result.scalar_one_or_none()


async def listar_doacoes_por_ong(
    db: AsyncSession, ong_id: int, limit: int, offset: int
) -> list[Doacao]:
    result = await db.execute(
        select(Doacao)
        .options(selectinload(Doacao.logs), selectinload(Doacao.doador))
        .where(
            Doacao.ong_matched_id == ong_id,
            Doacao.status.in_([
                StatusDoacao.matched,
                StatusDoacao.notificado,
                StatusDoacao.coletado,
                StatusDoacao.confirmado,
            ])
        )
        .order_by(Doacao.score_matching.desc().nulls_last())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def atualizar_status_doacao(
    db: AsyncSession,
    doacao_id: int,
    ong_id: int | None,
    novo_status: str,
    observacao: str | None,
) -> Doacao | None:
    result = await db.execute(
        select(Doacao)
        .options(selectinload(Doacao.logs), selectinload(Doacao.doador))
        .where(
            Doacao.id == doacao_id,
            Doacao.ong_matched_id == ong_id,
        )
    )
    doacao = result.scalar_one_or_none()
    if doacao is None:
        return None

    estado_anterior = doacao.status.value
    try:
        status_enum = StatusDoacao(novo_status)
    except ValueError:
        return None

    doacao.status = status_enum
    log = LogAFD(
        doacao_id=doacao.id,
        estado_anterior=estado_anterior,
        estado_novo=novo_status,
        descricao=observacao or f"Status atualizado para {novo_status} via API",
    )
    db.add(log)
    await db.commit()

    # Se status confirmado, atualizar historico_semanal
    if status_enum == StatusDoacao.confirmado:
        await _atualizar_historico_confirmacao(db, doacao)

    # Recarrega com eager load para serializacao Pydantic
    result2 = await db.execute(
        select(Doacao)
        .options(selectinload(Doacao.logs), selectinload(Doacao.doador))
        .where(Doacao.id == doacao_id)
    )
    return result2.scalar_one_or_none()


async def deletar_doacao(
    db: AsyncSession,
    doacao_id: int,
    doador_id: int,
) -> Doacao | None:
    """Soft delete: muda status para 'cancelado'.

    Preserva a linha no banco para manter histórico/dashboard/auditoria
    (logs AFD, scores de matching, FKs com ON DELETE SET NULL).
    Retorna None se a doacao nao existe ou nao pertence ao doador.
    """
    result = await db.execute(
        select(Doacao)
        .options(selectinload(Doacao.logs), selectinload(Doacao.doador))
        .where(Doacao.id == doacao_id, Doacao.doador_id == doador_id)
    )
    doacao = result.scalar_one_or_none()
    if doacao is None:
        return None

    # Se ja esta cancelada, idempotente: retorna sem erro
    if doacao.status == StatusDoacao.cancelado:
        logger.info("Doacao %s ja estava cancelada (idempotente)", doacao.id)
        return doacao

    estado_anterior = doacao.status.value
    doacao.status = StatusDoacao.cancelado
    log = LogAFD(
        doacao_id=doacao.id,
        estado_anterior=estado_anterior,
        estado_novo=StatusDoacao.cancelado.value,
        descricao=f"Doacao cancelada/excluida pelo doador (estado anterior: {estado_anterior})",
    )
    db.add(log)
    await db.commit()

    # Recarrega com eager load para serializacao Pydantic
    result2 = await db.execute(
        select(Doacao)
        .options(selectinload(Doacao.logs), selectinload(Doacao.doador))
        .where(Doacao.id == doacao_id)
    )
    return result2.scalar_one()


async def _atualizar_historico_confirmacao(db: AsyncSession, doacao: Doacao) -> None:
    """Soma a quantidade da doacao confirmada no historico da semana atual."""
    # Pegar segunda-feira desta semana (ISO week)
    hoje = date.today()
    semana = hoje - timedelta(days=hoje.weekday())
    ong_id = doacao.ong_matched_id
    if not ong_id:
        logger.warning("Doacao %s confirmada mas sem ONG matched", doacao.id)
        return

    # Procura registro existente para esta semana + ONG
    result = await db.execute(
        select(HistoricoAtendimento)
        .where(
            HistoricoAtendimento.ong_id == ong_id,
            HistoricoAtendimento.semana == semana,
        )
    )
    registro = result.scalar_one_or_none()

    if registro:
        registro.quantidade_atendida += doacao.quantidade
        logger.info(
            "Historico ONG %s semana %s: +%s kg (total=%s)",
            ong_id, semana, doacao.quantidade, registro.quantidade_atendida,
        )
    else:
        novo = HistoricoAtendimento(
            ong_id=ong_id,
            semana=semana,
            quantidade_atendida=doacao.quantidade,
        )
        db.add(novo)
        logger.info(
            "Historico ONG %s semana %s: criado com %s kg",
            ong_id, semana, doacao.quantidade,
        )
    await db.commit()
