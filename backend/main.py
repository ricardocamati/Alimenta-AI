from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth import auth_router
from database import Base, engine
from doacoes import doacoes_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Alimenta.AI",
    description="Sistema preditivo de redistribuição inteligente de alimentos com Machine Learning",
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


@app.get("/")
def root():
    return {"message": "Alimenta.AI API"}


@app.post("/ml/urgencia")
async def ml_urgencia_stub():
    return {"status": "received", "message": "ML urgencia endpoint — stub"}
