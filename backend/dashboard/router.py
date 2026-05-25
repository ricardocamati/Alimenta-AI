import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from auth.router import get_current_user_async
from database.connection import async_get_db
from database.models import TipoUsuario, Usuario
from dashboard.schemas import DashboardResponse
from dashboard.service import (
    get_admin_dashboard,
    get_doador_dashboard,
    get_ong_dashboard,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/", response_model=DashboardResponse)
async def dashboard_endpoint(
    current_user: Usuario = Depends(get_current_user_async),
    db: AsyncSession = Depends(async_get_db),
):
    if current_user.tipo == TipoUsuario.doador:
        return await get_doador_dashboard(db, current_user)
    elif current_user.tipo == TipoUsuario.ong:
        return await get_ong_dashboard(db, current_user)
    else:
        return await get_admin_dashboard(db, current_user)
