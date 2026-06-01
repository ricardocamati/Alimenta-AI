from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth.schemas import LoginRequest, TokenResponse, UsuarioCreate, UsuarioResponse
from auth.service import authenticate, register
from auth.utils import create_access_token, decode_access_token
from database.connection import async_get_db, get_db
from database.models import ONG, TipoUsuario, Usuario

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(async_get_db),
) -> Usuario:
    payload = decode_access_token(token)
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    result = await db.execute(
        select(Usuario).where(Usuario.id == int(user_id))
    )
    usuario = result.scalar_one_or_none()
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario nao encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return usuario


async def get_current_user_with_ong(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(async_get_db),
) -> Usuario:
    payload = decode_access_token(token)
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido ou expirado",
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
            detail="Usuario nao encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return usuario


def require_ong(
    current_user: Usuario = Depends(get_current_user_with_ong),
) -> Usuario:
    if current_user.tipo != TipoUsuario.ong:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas ONGs podem acessar este recurso",
        )
    return current_user


@router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def register_endpoint(payload: UsuarioCreate, db: AsyncSession = Depends(async_get_db)):
    from auth.service import register_async
    return await register_async(db, payload)


@router.post("/login", response_model=TokenResponse)
async def login_endpoint(payload: LoginRequest, db: AsyncSession = Depends(async_get_db)):
    from auth.service import authenticate_async
    usuario = await authenticate_async(db, payload.email, payload.senha)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha invalidos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(data={"sub": str(usuario.id), "tipo": usuario.tipo.value})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UsuarioResponse)
async def me_endpoint(current_user: Usuario = Depends(get_current_user_with_ong)):
    return current_user
