from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload

from auth.schemas import LoginRequest, TokenResponse, UsuarioCreate, UsuarioResponse
from auth.service import authenticate, register
from auth.utils import create_access_token, decode_access_token
from database.connection import async_get_db, get_db
from database.models import Usuario

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    payload = decode_access_token(token)
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    usuario = (
        db.query(Usuario)
        .options(selectinload(Usuario.ong))
        .filter(Usuario.id == int(user_id))
        .first()
    )
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return usuario


async def get_current_user_async(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(async_get_db),
) -> Usuario:
    payload = decode_access_token(token)
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    result = await db.execute(
        select(Usuario)
        .options(selectinload(Usuario.ong))
        .where(Usuario.id == int(user_id))
    )
    usuario = result.scalar_one_or_none()
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return usuario


@router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def register_endpoint(payload: UsuarioCreate, db: Session = Depends(get_db)):
    existente = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email já cadastrado",
        )
    if payload.cpf_cnpj:
        cpf_cnpj_existente = (
            db.query(Usuario).filter(Usuario.cpf_cnpj == payload.cpf_cnpj).first()
        )
        if cpf_cnpj_existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="CPF/CNPJ já cadastrado",
            )
    usuario = register(db, payload)
    return usuario


@router.post("/login", response_model=TokenResponse)
def login_endpoint(payload: LoginRequest, db: Session = Depends(get_db)):
    usuario = authenticate(db, payload.email, payload.senha)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": str(usuario.id), "tipo": usuario.tipo.value})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UsuarioResponse)
def me_endpoint(current_user: Usuario = Depends(get_current_user)):
    return current_user
