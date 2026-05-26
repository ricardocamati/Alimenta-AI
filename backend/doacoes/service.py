import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.models import Doacao, LogAFD, StatusDoacao, Urgencia
from doacoes.schemas import DoacaoCreate
from ml.predictor import UrgencyPredictor

logger = logging.getLogger(__name__)


async def criar_doacao(
    db: AsyncSession, payload: DoacaoCreate, doador_id: int
) -> Doacao:
    doacao = Doacao(
        doador_id=doador_id,
        tipo_alimento=payload.tipo_alimento,
        categoria=payload.categoria,
        quantidade=payload.quantidade,
        data_validade=payload.data_validade,
        foto_url=payload.foto_url,
        latitude=payload.latitude,
        longitude=payload.longitude,
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
    return doacao


async def listar_doacoes(
    db: AsyncSession, doador_id: int, limit: int, offset: int
) -> list[Doacao]:
    result = await db.execute(
        select(Doacao)
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
        .options(selectinload(Doacao.logs))
        .where(Doacao.id == doacao_id, Doacao.doador_id == doador_id)
    )
    return result.scalar_one_or_none()
