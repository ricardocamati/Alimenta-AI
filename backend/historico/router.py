from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.router import get_current_user_with_ong, require_ong
from database.connection import async_get_db
from database.models import Usuario
from historico.schemas import HistoricoAtendimentoCreate, HistoricoAtendimentoResponse
from historico.service import listar_historico_ong, registrar_atendimento

router = APIRouter(prefix="/historico", tags=["historico"])


@router.post("/", response_model=HistoricoAtendimentoResponse, status_code=status.HTTP_201_CREATED)
async def criar_historico(
    payload: HistoricoAtendimentoCreate,
    current_user: Usuario = Depends(require_ong),
    db: AsyncSession = Depends(async_get_db),
):
    """ONG registra sua quantidade atendida na semana.
    Aceita upsert (atualiza se ja existir mesma semana).
    MODO TESTE: aceita qualquer usuario autenticado."""
    # MODO TESTE: usa ONG id=1 quando usuario nao tem ONG vinculada
    ong_id = current_user.ong.id if current_user.ong else 1
    payload.ong_id = ong_id  # sobrescreve para garantir consistencia

    try:
        reg = await registrar_atendimento(db, payload)
        return reg
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/me", response_model=list[HistoricoAtendimentoResponse])
async def meu_historico(
    limit: int = Query(default=52, ge=1, le=104),
    offset: int = Query(default=0, ge=0),
    current_user: Usuario = Depends(require_ong),
    db: AsyncSession = Depends(async_get_db),
):
    # MODO TESTE: usa ONG id=1 quando usuario nao tem ONG vinculada
    ong_id = current_user.ong.id if current_user.ong else 1
    return await listar_historico_ong(db, ong_id, limit, offset)
