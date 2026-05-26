from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from database.models import StatusDoacao, Urgencia

__all__ = [
    "DoacaoCreate",
    "DoacaoResponse",
    "DoacaoDetailedResponse",
    "LogAFDResponse",
]


class DoacaoCreate(BaseModel):
    tipo_alimento: str = Field(min_length=1, max_length=100)
    categoria: str = Field(min_length=1, max_length=100)
    quantidade: float
    data_validade: date
    foto_url: str | None = Field(default=None, max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("data_validade")
    @classmethod
    def data_validade_futura(cls, v: date) -> date:
        if v <= date.today():
            raise ValueError("data_validade deve ser uma data futura")
        return v

    @field_validator("quantidade")
    @classmethod
    def quantidade_positiva(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("quantidade deve ser maior que zero")
        return v


class LogAFDResponse(BaseModel):
    id: int
    estado_anterior: str
    estado_novo: str
    timestamp: datetime
    descricao: str | None = None

    model_config = {"from_attributes": True}


class DoacaoResponse(BaseModel):
    id: int
    doador_id: int
    tipo_alimento: str
    categoria: str
    quantidade: float
    foto_url: str | None = None
    data_validade: date
    latitude: float | None = None
    longitude: float | None = None
    status: StatusDoacao
    urgencia: Urgencia
    score_matching: float | None = None
    criado_em: datetime
    atualizado_em: datetime

    model_config = {"from_attributes": True}


class DoacaoDetailedResponse(DoacaoResponse):
    logs: list[LogAFDResponse] = []
