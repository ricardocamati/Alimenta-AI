import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.router import get_current_user_with_ong, require_ong
from database.connection import async_get_db
from database.models import Usuario
from doacoes.schemas import DoacaoResponse
from doacoes.service import listar_doacoes_por_ong
from ongs.schemas import OngMeResponse, OngPreferencesUpdate
from ongs.service import get_ong_me, update_ong_preferences

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ongs", tags=["ongs"])


@router.get("/me", response_model=OngMeResponse)
async def ong_me(
    current_user: Usuario = Depends(get_current_user_with_ong),
    db: AsyncSession = Depends(async_get_db),
):
    if current_user.ong is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario nao possui ONG vinculada",
        )
    ong = await get_ong_me(db, current_user.ong.id)
    if ong is None:
        raise HTTPException(status_code=404, detail="ONG nao encontrada")
    return ong


@router.patch("/me/preferences", response_model=OngMeResponse)
async def update_preferences(
    payload: OngPreferencesUpdate,
    current_user: Usuario = Depends(require_ong),
    db: AsyncSession = Depends(async_get_db),
):
    ong_id = current_user.ong.id if current_user.ong else None
    if ong_id is None:
        raise HTTPException(status_code=400, detail="Usuario sem ONG vinculada")
    result = await update_ong_preferences(db, ong_id, payload)
    if result is None:
        raise HTTPException(status_code=404, detail="ONG nao encontrada")
    return result


@router.get("/me/disponiveis", response_model=list[DoacaoResponse])
async def listar_disponiveis(
    current_user: Usuario = Depends(require_ong),
    db: AsyncSession = Depends(async_get_db),
):
    """Doacoes matched/notificado para a ONG (alias de /doacoes/ongs/me/doacoes)."""
    ong_id = current_user.ong.id if current_user.ong else None
    if ong_id is None:
        raise HTTPException(status_code=400, detail="Usuario sem ONG vinculada")
    return await listar_doacoes_por_ong(db, ong_id, limit=50, offset=0)
