from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from database.models import StatusDoacao, Urgencia

__all__ = [
    "DoacaoCreate",
    "DoacaoResponse",
    "DoacaoDetailedResponse",
    "LogAFDResponse",
    "MatchingPreviewRequest",
    "MatchingPreviewResponse",
    "UrgencyPreviewRequest",
    "UrgencyPreviewResponse",
]


class DoacaoCreate(BaseModel):
    tipo_alimento: str = Field(min_length=1, max_length=100)
    categoria: str = Field(min_length=1, max_length=100)
    quantidade: float
    unidade_medida: str = Field(default="kg", min_length=1, max_length=20)
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


class StatusUpdateRequest(BaseModel):
    status: str
    observacao: str | None = None


class DoacaoResponse(BaseModel):
    id: int
    doador_id: int
    doador_nome: str | None = None
    doador_endereco: str | None = None
    doador_latitude: float | None = None
    doador_longitude: float | None = None
    doador_telefone: str | None = None
    tipo_alimento: str
    categoria: str
    quantidade: float
    unidade_medida: str | None = None
    foto_url: str | None = None
    data_validade: date
    latitude: float | None = None
    longitude: float | None = None
    status: StatusDoacao
    urgencia: Urgencia
    score_matching: float | None = None
    distancia_km: float | None = None
    criado_em: datetime
    atualizado_em: datetime
    logs: list[LogAFDResponse] = []

    model_config = {"from_attributes": True}


class DoacaoDetailedResponse(DoacaoResponse):
    pass  # Agora herda logs de DoacaoResponse


class MatchingPreviewRequest(BaseModel):
    tipo_alimento: str = Field(min_length=1, max_length=100)
    categoria: str = Field(min_length=1, max_length=100)
    quantidade: float
    unidade_medida: str = Field(default="kg", min_length=1, max_length=20)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)

    @field_validator("quantidade")
    @classmethod
    def quantidade_positiva(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("quantidade deve ser maior que zero")
        return v


class MatchingPreviewResponse(BaseModel):
    """Preview do matching sem persistir. None quando não há ONG elegível."""
    ong_id: int | None = None
    ong_nome: str | None = None
    score: float | None = None  # 0-100
    distancia_km: float | None = None
    total_ongs_avaliadas: int = 0
    gps_usado_fallback: bool = False  # True se lat/lon ausentes → (0,0)


class UrgencyPreviewRequest(BaseModel):
    tipo_alimento: str = Field(min_length=1, max_length=100)
    categoria: str = Field(min_length=1, max_length=100)
    dias_ate_vencimento: int = Field(ge=0, le=365)
    temperatura_celsius: float = Field(default=25.0, ge=-30, le=60)


class UrgencyPreviewResponse(BaseModel):
    urgencia: str  # "baixa" | "media" | "alta" | "critica" | "indefinida"
    modelo_disponivel: bool  # False = modelo ML não carregado
