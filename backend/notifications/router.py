import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.router import get_current_user
from database.connection import async_get_db
from database.models import CategoriaNotificacao, TipoUsuario, Usuario
from notifications.schemas import NotificacaoResponse
from notifications.service import (
    listar_notificacoes_usuario,
    marcar_lida,
    marcar_todas_lidas,
    trigger_expiry_alerts,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _tipo_to_user_type(t: str) -> TipoUsuario:
    try:
        return TipoUsuario(t)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"user_type invalido: {t}",
        )


@router.get("/", response_model=list[NotificacaoResponse])
async def listar_notificacoes(
    unread_only: bool = Query(default=False),
    category: str | None = Query(default=None),
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(async_get_db),
):
    cat_enum: CategoriaNotificacao | None = None
    if category:
        try:
            cat_enum = CategoriaNotificacao(category)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"category invalida: {category}",
            )
    return await listar_notificacoes_usuario(
        db,
        user_id=str(current_user.id),
        user_type=current_user.tipo,
        unread_only=unread_only,
        category=cat_enum,
    )


@router.patch("/{notif_id}/read", response_model=NotificacaoResponse)
async def marcar_como_lida(
    notif_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(async_get_db),
):
    n = await marcar_lida(db, notif_id)
    if n is None:
        raise HTTPException(status_code=404, detail="Notificacao nao encontrada")
    if (
        n.user_id != str(current_user.id)
        or n.user_type != current_user.tipo
        and current_user.tipo != TipoUsuario.admin
    ):
        raise HTTPException(status_code=403, detail="Sem permissao para esta notificacao")
    return n


@router.patch("/read-all")
async def marcar_todas_como_lidas(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(async_get_db),
):
    n = await marcar_todas_lidas(
        db,
        user_id=str(current_user.id),
        user_type=current_user.tipo,
    )
    return {"atualizadas": n}


@router.post("/trigger-expiry")
async def trigger_expiry_endpoint(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(async_get_db),
):
    """Dispara alertas de vencimento. Aberto a qualquer usuario autenticado."""
    criadas = await trigger_expiry_alerts(db)
    return {"criadas": criadas}
