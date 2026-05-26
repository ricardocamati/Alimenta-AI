from datetime import datetime
from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field

from database.models import StatusDoacao, Urgencia

__all__ = [
    "DoacaoResumo",
    "TopDoador",
    "TopOng",
    "DashboardDoador",
    "DashboardONG",
    "DashboardAdmin",
    "DashboardResponse",
]


class DoacaoResumo(BaseModel):
    id: int
    tipo_alimento: str
    urgencia: Urgencia
    status: StatusDoacao
    criado_em: datetime

    model_config = {"from_attributes": True}


class TopDoador(BaseModel):
    nome: str
    total_doacoes: int
    taxa_aproveitamento: float


class TopOng(BaseModel):
    nome: str
    total_recebido: int
    demanda_prevista: float


class DashboardDoador(BaseModel):
    perfil: Literal["doador"] = "doador"
    total_doacoes: int
    doacoes_confirmadas: int
    doacoes_canceladas: int
    taxa_aproveitamento: float
    tempo_medio_coleta_horas: float | None = None
    distribuicao_urgencia: dict[str, int]
    ultimas_doacoes: list[DoacaoResumo]


class DashboardONG(BaseModel):
    perfil: Literal["ong"] = "ong"
    total_doacoes_recebidas: int
    demanda_prevista_proxima_semana: float
    alerta_escassez: bool
    doacoes_pendentes: int
    distribuicao_categorias: dict[str, int]
    ultimas_doacoes: list[DoacaoResumo]


class DashboardAdmin(BaseModel):
    perfil: Literal["admin"] = "admin"
    total_usuarios: int
    total_doacoes: int
    total_ongs: int
    taxa_aproveitamento_geral: float
    tempo_medio_coleta_horas: float | None = None
    doacoes_por_status: dict[str, int]
    doacoes_por_urgencia: dict[str, int]
    top_5_doadores: list[TopDoador]
    top_5_ongs: list[TopOng]


DashboardResponse = Annotated[
    Union[DashboardDoador, DashboardONG, DashboardAdmin],
    Field(discriminator="perfil"),
]
