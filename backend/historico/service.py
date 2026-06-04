import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import HistoricoAtendimento, ONG
from historico.schemas import HistoricoAtendimentoCreate

logger = logging.getLogger(__name__)


async def registrar_atendimento(
    db: AsyncSession, payload: HistoricoAtendimentoCreate
) -> HistoricoAtendimento:
    """Registra uma semana de atendimento real da ONG."""
    # Verifica se ONG existe
    result = await db.execute(select(ONG).where(ONG.id == payload.ong_id))
    ong = result.scalar_one_or_none()
    if ong is None:
        raise ValueError(f"ONG {payload.ong_id} nao encontrada")

    # Verifica duplicado (mesma ong + mesma semana)
    result = await db.execute(
        select(HistoricoAtendimento).where(
            HistoricoAtendimento.ong_id == payload.ong_id,
            HistoricoAtendimento.semana == payload.semana,
        )
    )
    existente = result.scalar_one_or_none()
    if existente:
        # Atualiza quantidade
        existente.quantidade_atendida = payload.quantidade_atendida
        await db.commit()
        await db.refresh(existente)
        logger.info(
            "Historico atualizado: ONG %s semana %s = %s kg",
            payload.ong_id,
            payload.semana,
            payload.quantidade_atendida,
        )
        return existente

    # Cria novo
    reg = HistoricoAtendimento(
        ong_id=payload.ong_id,
        semana=payload.semana,
        quantidade_atendida=payload.quantidade_atendida,
    )
    db.add(reg)
    await db.commit()
    await db.refresh(reg)
    logger.info(
        "Historico criado: ONG %s semana %s = %s kg",
        payload.ong_id,
        payload.semana,
        payload.quantidade_atendida,
    )
    return reg


async def listar_historico_ong(
    db: AsyncSession, ong_id: int, limit: int = 52, offset: int = 0
) -> list[HistoricoAtendimento]:
    result = await db.execute(
        select(HistoricoAtendimento)
        .where(HistoricoAtendimento.ong_id == ong_id)
        .order_by(HistoricoAtendimento.semana.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())
