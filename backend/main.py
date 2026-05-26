import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from auth import auth_router
from config import settings
from dashboard import dashboard_router
from doacoes import doacoes_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Alimenta.AI",
    description="Sistema preditivo de redistribuicao inteligente de alimentos com Machine Learning",
    version="0.1.0",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from ml.predictor import init_predictor
    from ml.demand_predictor import init_demand_predictor

    init_predictor()
    init_demand_predictor()

    if settings.TEST_MODE:
        logger.warning("*** MODO TESTE ATIVO: autenticacao e seguranca desabilitados ***")
        await _setup_test_mode(app)

    yield


async def _setup_test_mode(app: FastAPI) -> None:
    from database.connection import AsyncSessionLocal
    from database.models import ONG, TipoUsuario, Usuario
    from auth.utils import hash_password

    async with AsyncSessionLocal() as db:

        async def get_or_create(email: str, nome: str, tipo: TipoUsuario) -> Usuario:
            existing = await db.scalar(select(Usuario).where(Usuario.email == email))
            if existing is not None:
                return existing
            u = Usuario(
                nome=nome,
                email=email,
                senha_hash=hash_password("teste123"),
                tipo=tipo,
            )
            db.add(u)
            await db.flush()
            logger.info("Usuario de teste criado: %s (%s, id=%s)", email, tipo.value, u.id)
            return u

        await get_or_create("admin@teste.com", "Admin Teste", TipoUsuario.admin)
        await get_or_create("doador@teste.com", "Doador Teste", TipoUsuario.doador)

        ong_user = await get_or_create("ong@teste.com", "ONG Teste", TipoUsuario.ong)
        existing_ong = await db.scalar(
            select(ONG).where(ONG.usuario_id == ong_user.id)
        )
        if existing_ong is None:
            db.add(
                ONG(
                    usuario_id=ong_user.id,
                    cnpj="00.000.000/0001-00",
                    capacidade_atendimento=150,
                    latitude=-23.5505,
                    longitude=-46.6333,
                )
            )
            logger.info("ONG de teste criada para usuario %s", ong_user.id)

        await db.commit()

    app.dependency_overrides.update(_get_test_overrides())


def _get_test_overrides() -> dict:
    from auth.router import get_current_user, get_current_user_with_ong, oauth2_scheme
    from doacoes.router import require_doador
    from database.connection import AsyncSessionLocal
    from database.models import Usuario
    from sqlalchemy.orm import selectinload

    async def _mock_admin():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Usuario)
                .options(selectinload(Usuario.ong))
                .where(Usuario.email == "admin@teste.com")
            )
            return result.scalar_one()

    async def _mock_doador():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Usuario).where(Usuario.email == "doador@teste.com")
            )
            return result.scalar_one()

    async def _mock_token():
        return "test-mode-token"

    return {
        get_current_user: _mock_admin,
        get_current_user_with_ong: _mock_admin,
        require_doador: _mock_doador,
        oauth2_scheme: _mock_token,
    }


app.router.lifespan_context = lifespan

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(doacoes_router)
app.include_router(dashboard_router)


@app.get("/")
async def root():
    return {"message": "Alimenta.AI API"}
