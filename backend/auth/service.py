import asyncio
import logging

from sqlalchemy.orm import Session

from auth.schemas import UsuarioCreate
from auth.utils import hash_password, verify_password
from database.models import ONG, Usuario

logger = logging.getLogger(__name__)

__all__ = ["register", "authenticate"]


def register(db: Session, payload: UsuarioCreate) -> Usuario:
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
                    lat, lon = 0.0, 0.0
                    logger.warning(
                        "Geocodificacao falhou para ONG %s. Usando (0.0, 0.0).",
                        payload.email,
                    )
                else:
                    lat, lon = result
            else:
                lat, lon = 0.0, 0.0
                logger.warning(
                    "ONG %s sem endereco e sem GPS. Usando (0.0, 0.0).",
                    payload.email,
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


def authenticate(db: Session, email: str, password: str) -> Usuario | None:
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        return None
    if not verify_password(password, usuario.senha_hash):
        return None
    return usuario
