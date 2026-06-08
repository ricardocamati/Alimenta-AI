import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from auth.router import get_current_user, get_current_user_with_ong, require_ong
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
    """Verifica se o usuario autenticado e doador.

    NOTA: Usa get_current_user (sem eager-load de ONG) por performance.
    Se precisar acessar dados da ONG neste guard, troque para
    get_current_user_with_ong.
    """
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


UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "fotos_doacoes"


@router.post("/upload-foto")
async def upload_foto(file: UploadFile):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename).suffix if file.filename else ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename
    content = await file.read()
    filepath.write_bytes(content)
    return {"url": f"http://127.0.0.1:8000/uploads/fotos_doacoes/{filename}"}


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


from doacoes.service import listar_doacoes_por_ong, atualizar_status_doacao
from doacoes.schemas import StatusUpdateRequest

@router.get("/ongs/me/doacoes", response_model=list[DoacaoDetailedResponse])
async def listar_doacoes_ong_endpoint(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: Usuario = Depends(require_ong),
    db: AsyncSession = Depends(async_get_db),
):
    ong_id = current_user.ong.id if current_user.ong else None
    if not ong_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario nao possui ONG vinculada",
        )
    return await listar_doacoes_por_ong(db, ong_id, limit, offset)


@router.patch("/{doacao_id}/status", response_model=DoacaoResponse)
async def atualizar_status_endpoint(
    doacao_id: int,
    payload: StatusUpdateRequest,
    current_user: Usuario = Depends(require_ong),
    db: AsyncSession = Depends(async_get_db),
):
    doacao = await atualizar_status_doacao(
        db,
        doacao_id=doacao_id,
        ong_id=current_user.ong.id if current_user.ong else None,
        novo_status=payload.status,
        observacao=payload.observacao,
    )
    if doacao is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doacao nao encontrada ou nao vinculada a esta ONG",
        )
    return doacao
