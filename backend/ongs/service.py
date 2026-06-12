"""Servico de preferencias de ONG."""
import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import ONG
from ongs.schemas import OngMeResponse, OngPreferencesUpdate, parse_food_types, serialize_food_types

logger = logging.getLogger(__name__)


async def get_ong_me(db: AsyncSession, ong_id: int) -> OngMeResponse | None:
    result = await db.execute(select(ONG).where(ONG.id == ong_id))
    ong = result.scalar_one_or_none()
    if ong is None:
        return None
    return OngMeResponse(
        id=ong.id,
        cnpj=ong.cnpj,
        capacidade_atendimento=ong.capacidade_atendimento,
        latitude=ong.latitude,
        longitude=ong.longitude,
        pickup_radius=ong.pickup_radius,
        accepted_food_types=parse_food_types(ong.accepted_food_types),
        pickup_schedule=ong.pickup_schedule,
    )


async def update_ong_preferences(
    db: AsyncSession, ong_id: int, prefs: OngPreferencesUpdate
) -> OngMeResponse | None:
    result = await db.execute(select(ONG).where(ONG.id == ong_id))
    ong = result.scalar_one_or_none()
    if ong is None:
        return None

    if prefs.capacidade_atendimento is not None:
        ong.capacidade_atendimento = prefs.capacidade_atendimento
    if prefs.pickup_radius is not None:
        ong.pickup_radius = prefs.pickup_radius
    if prefs.accepted_food_types is not None:
        ong.accepted_food_types = serialize_food_types(prefs.accepted_food_types)
    if prefs.pickup_schedule is not None:
        ong.pickup_schedule = prefs.pickup_schedule

    await db.commit()
    await db.refresh(ong)
    logger.info("ONG %s preferencias atualizadas", ong_id)
    return await get_ong_me(db, ong_id)
