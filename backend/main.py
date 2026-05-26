from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import auth_router
from dashboard import dashboard_router
from doacoes import doacoes_router

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
    yield


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
