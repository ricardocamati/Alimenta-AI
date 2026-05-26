import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.router import get_current_user
from database.connection import async_get_db, AsyncSessionLocal
from database.models import TipoUsuario, Usuario
from doacoes.schemas import DoacaoCreate, DoacaoDetailedResponse, DoacaoResponse
from doacoes.service import buscar_doacao_por_id, criar_doacao, listar_doacoes
from matching.service import calcular_matching

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/doacoes", tags=["doacoes"])


def require_doador(
    current_user: Usuario = Depends(get_current_user),
) -> Usuario:
    if current_user.tipo != TipoUsuario.doador:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas doadores podem acessar este recurso",
        )
    return current_user


async def trigger_calcular_matching(doacao_id: int):
    logger.info("BackgroundTask: calcular_matching(%s) iniciado", doacao_id)
    async with AsyncSessionLocal() as db:
        try:
            await calcular_matching(doacao_id, db)
        except Exception:
            logger.exception("BackgroundTask: calcular_matching(%s) falhou", doacao_id)


@router.post(
    "/", response_model=DoacaoResponse, status_code=status.HTTP_201_CREATED
)
async def criar_doacao_endpoint(
    payload: DoacaoCreate,
    background_tasks: BackgroundTasks,
    current_user: Usuario = Depends(require_doador),
    db: AsyncSession = Depends(async_get_db),
):
    doacao = await criar_doacao(db, payload, current_user.id)
    background_tasks.add_task(trigger_calcular_matching, doacao.id)
    return doacao


@router.get("/", response_model=list[DoacaoResponse])
async def listar_doacoes_endpoint(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: Usuario = Depends(require_doador),
    db: AsyncSession = Depends(async_get_db),
):
    return await listar_doacoes(db, current_user.id, limit, offset)


@router.get("/{doacao_id}", response_model=DoacaoDetailedResponse)
async def detalhe_doacao_endpoint(
    doacao_id: int,
    current_user: Usuario = Depends(require_doador),
    db: AsyncSession = Depends(async_get_db),
):
    doacao = await buscar_doacao_por_id(db, doacao_id, current_user.id)
    if doacao is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doacao nao encontrada",
        )
    return doacao
