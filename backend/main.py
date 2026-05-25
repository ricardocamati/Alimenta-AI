import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import auth_router
from database import Base, engine
from dashboard import dashboard_router
from doacoes import doacoes_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando Alimenta.AI...")
    Base.metadata.create_all(bind=engine)

    from ml.predictor import init_predictor
    from ml.demand_predictor import init_demand_predictor

    init_predictor()
    init_demand_predictor()

    logger.info("Startup concluido.")
    yield
    logger.info("Encerrando Alimenta.AI.")


app = FastAPI(
    title="Alimenta.AI",
    description="Sistema preditivo de redistribuicao inteligente de alimentos com Machine Learning",
    version="0.1.0",
    lifespan=lifespan,
)

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
def root():
    return {"message": "Alimenta.AI API"}
