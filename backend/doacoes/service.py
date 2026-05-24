from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database.models import Doacao, LogAFD, StatusDoacao
from doacoes.schemas import DoacaoCreate


async def criar_doacao(db: AsyncSession, payload: DoacaoCreate, doador_id: int) -> Doacao:
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
        descricao="Doação cadastrada pelo doador",
    )
    db.add(log)
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
