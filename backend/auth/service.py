from sqlalchemy.orm import Session

from auth.schemas import UsuarioCreate
from auth.utils import hash_password, verify_password
from database.models import ONG, Usuario


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
        ong = ONG(
            usuario_id=usuario.id,
            cnpj=payload.ong.cnpj,
            capacidade_atendimento=payload.ong.capacidade_atendimento,
            latitude=payload.ong.latitude,
            longitude=payload.ong.longitude,
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
