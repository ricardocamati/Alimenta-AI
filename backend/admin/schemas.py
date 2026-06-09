from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

__all__ = ["WeightsResponse", "WeightsUpdate", "UserAdminResponse", "OngAdminResponse", "AuditLogResponse"]


class WeightsResponse(BaseModel):
    urgency: float
    demand: float
    distance: float
    updated_at: datetime | None = None


class WeightsUpdate(BaseModel):
    urgency: float = Field(ge=0, le=1)
    demand: float = Field(ge=0, le=1)
    distance: float = Field(ge=0, le=1)


class UserAdminResponse(BaseModel):
    id: int
    nome: str
    email: str
    tipo: str
    cpf_cnpj: str | None = None
    criado_em: datetime
    ong_id: int | None = None

    model_config = ConfigDict(from_attributes=True)


class OngAdminResponse(BaseModel):
    id: int
    usuario_id: int
    cnpj: str
    capacidade_atendimento: int
    latitude: float
    longitude: float
    pickup_radius: float | None = None
    accepted_food_types: str | None = None
    pickup_schedule: str | None = None
    usuario_nome: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AuditLogResponse(BaseModel):
    id: int
    doacao_id: int
    estado_anterior: str
    estado_novo: str
    timestamp: datetime
    descricao: str | None = None
    doacao_nome: str | None = None

    model_config = ConfigDict(from_attributes=True)
