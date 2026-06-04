import asyncio
import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select as future_select
from sqlalchemy.orm import Session

from auth.schemas import UsuarioCreate
from auth.utils import hash_password, verify_password
from database.models import ONG, Usuario

logger = logging.getLogger(__name__)

__all__ = ["register", "authenticate", "register_async", "authenticate_async"]


def register(db: Session, payload: UsuarioCreate) -> Usuario:
    """Synchronous register (deprecated — use register_async)."""
    usuario = Usuario(
        nome=payload.nome,
        email=payload.email,
        senha_hash=hash_password(payload.senha),
        tipo=payload.tipo,
        cpf_cnpj=payload.cpf_cnpj,
        endereco=payload.endereco,
        telefone=payload.telefone,
    )
    db.add(usuario)
    db.flush()

    if payload.tipo.value == "ong" and payload.ong is not None:
        lat = payload.ong.latitude
        lon = payload.ong.longitude

        if lat is None or lon is None:
            if payload.endereco:
                logger.info(
                    "ONG sem GPS. Tentando geocode do endereco: %s",
                    payload.endereco,
                )
                from matching.geocoding import geocode_address

                try:
                    result = asyncio.run(geocode_address(payload.endereco))
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    try:
                        result = loop.run_until_complete(
                            geocode_address(payload.endereco)
                        )
                    finally:
                        loop.close()
                if result is None:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Nao foi possivel geocodificar o endereco: {payload.endereco}. Forneca latitude/longitude explicitos.",
                    )
                else:
                    lat, lon = result
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="ONG requer endereco ou latitude/longitude para geolocalizacao.",
                )

        ong = ONG(
            usuario_id=usuario.id,
            cnpj=payload.ong.cnpj,
            capacidade_atendimento=payload.ong.capacidade_atendimento,
            latitude=lat,
            longitude=lon,
        )
        db.add(ong)

    db.commit()
    db.refresh(usuario)
    return usuario


async def register_async(db: AsyncSession, payload: UsuarioCreate) -> Usuario:
    """Asynchronous register — preferred."""
    # Check email uniqueness
    result = await db.execute(future_select(Usuario).where(Usuario.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email ja cadastrado",
        )

    if payload.cpf_cnpj:
        result = await db.execute(future_select(Usuario).where(Usuario.cpf_cnpj == payload.cpf_cnpj))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="CPF/CNPJ ja cadastrado",
            )

    if payload.ong is not None and payload.ong.cnpj:
        result = await db.execute(future_select(ONG).where(ONG.cnpj == payload.ong.cnpj))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="CNPJ da ONG ja cadastrado",
            )

    usuario = Usuario(
        nome=payload.nome,
        email=payload.email,
        senha_hash=hash_password(payload.senha),
        tipo=payload.tipo,
        cpf_cnpj=payload.cpf_cnpj,
        endereco=payload.endereco,
        telefone=payload.telefone,
    )
    db.add(usuario)
    await db.flush()

    if payload.tipo.value == "ong" and payload.ong is not None:
        lat = payload.ong.latitude
        lon = payload.ong.longitude

        if lat is None or lon is None and payload.endereco:
            from matching.geocoding import geocode_address
            result_geo = await geocode_address(payload.endereco)
            if result_geo is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Nao foi possivel geocodificar o endereco: {payload.endereco}. Forneca latitude/longitude explicitos.",
                )
            lat, lon = result_geo

        if lat is None or lon is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="ONG requer endereco ou latitude/longitude para geolocalizacao.",
            )

        ong = ONG(
            usuario_id=usuario.id,
            cnpj=payload.ong.cnpj,
            capacidade_atendimento=payload.ong.capacidade_atendimento,
            latitude=lat,
            longitude=lon,
        )
        db.add(ong)

    await db.commit()
    await db.refresh(usuario)
    return usuario


def authenticate(db: Session, email: str, password: str) -> Usuario | None:
    """Synchronous authenticate (deprecated — use authenticate_async)."""
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        return None
    if not verify_password(password, usuario.senha_hash):
        return None
    return usuario


async def authenticate_async(db: AsyncSession, email: str, password: str) -> Usuario | None:
    """Asynchronous authenticate — preferred."""
    result = await db.execute(future_select(Usuario).where(Usuario.email == email))
    usuario = result.scalar_one_or_none()
    if not usuario:
        return None
    if not verify_password(password, usuario.senha_hash):
        return None
    return usuario
