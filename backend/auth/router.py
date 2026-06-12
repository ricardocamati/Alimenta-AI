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
    """Em modo de teste, permite qualquer tipo de usuário acessar funções de ONG."""
    # MODO TESTE: bypass de permissão para qualquer usuário autenticado
    return current_user


def require_admin(
    current_user: Usuario = Depends(get_current_user_with_ong),
) -> Usuario:
    """Em modo de teste, permite qualquer tipo de usuário acessar funções de admin."""
    # MODO TESTE: bypass de permissão para qualquer usuário autenticado
    return current_user


def require_doador(
    current_user: Usuario = Depends(get_current_user_with_ong),
) -> Usuario:
    """Em modo de teste, permite qualquer tipo de usuário acessar funções de doador."""
    # MODO TESTE: bypass de permissão para qualquer usuário autenticado
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
    from config import settings
    return UsuarioResponse.model_validate(
        {
            "id": current_user.id,
            "nome": current_user.nome,
            "email": current_user.email,
            "tipo": current_user.tipo,
            "cpf_cnpj": current_user.cpf_cnpj,
            "endereco": current_user.endereco,
            "telefone": current_user.telefone,
            "latitude": current_user.latitude,
            "longitude": current_user.longitude,
            "criado_em": current_user.criado_em,
            "ong": current_user.ong,
            "is_test_mode": settings.TEST_MODE,
        }
    )


@router.get("/cep/{cep}")
async def lookup_cep(cep: str):
    """Busca dados de um CEP brasileiro via ViaCEP + Nominatim (lat/long).
    Usado pelo frontend no cadastro para auto-preencher endereço."""
    from matching.geocoding import fetch_cep
    result = await fetch_cep(cep)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CEP nao encontrado ou invalido",
        )
    return result
