import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from admin.schemas import (
    AuditLogResponse,
    OngAdminResponse,
    UserAdminResponse,
    WeightsResponse,
    WeightsUpdate,
)
from admin.service import (
    get_weights,
    listar_audit_logs,
    listar_ongs,
    listar_usuarios,
    set_weights,
    trigger_retrain,
)
from auth.router import get_current_user_with_ong, require_admin
from database.connection import async_get_db
from database.models import Usuario

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserAdminResponse])
async def admin_users(
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(async_get_db),
):
    return await listar_usuarios(db)


@router.get("/ongs", response_model=list[OngAdminResponse])
async def admin_ongs(
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(async_get_db),
):
    return await listar_ongs(db)


@router.get("/audit-logs", response_model=list[AuditLogResponse])
async def admin_audit_logs(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(async_get_db),
):
    return await listar_audit_logs(db, limit, offset)


@router.get("/weights", response_model=WeightsResponse)
async def admin_get_weights(
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(async_get_db),
):
    return await get_weights(db)


@router.patch("/weights", response_model=WeightsResponse)
async def admin_set_weights(
    payload: WeightsUpdate,
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(async_get_db),
):
    return await set_weights(db, payload)


@router.post("/retrain")
async def admin_retrain(
    admin: Usuario = Depends(require_admin),
    db: AsyncSession = Depends(async_get_db),
):
    return await trigger_retrain(db)
