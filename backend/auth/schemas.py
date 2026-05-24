import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator, model_validator

from database.models import TipoUsuario


class ONGCreate(BaseModel):
    cnpj: str
    capacidade_atendimento: int
    latitude: float
    longitude: float


class ONGResponse(BaseModel):
    id: int
    cnpj: str
    capacidade_atendimento: int
    latitude: float
    longitude: float

    model_config = {"from_attributes": True}


class UsuarioCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    tipo: TipoUsuario
    cpf_cnpj: str | None = None
    endereco: str | None = None
    telefone: str | None = None
    ong: ONGCreate | None = None

    @field_validator("senha")
    @classmethod
    def senha_minima(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("A senha deve ter pelo menos 6 caracteres")
        return v

    @field_validator("cpf_cnpj")
    @classmethod
    def validar_formato_cpf_cnpj(cls, v: str | None, info) -> str | None:
        if v is None:
            return v
        tipo = info.data.get("tipo")
        if tipo == TipoUsuario.doador:
            if not re.match(r"^\d{3}\.\d{3}\.\d{3}-\d{2}$", v):
                raise ValueError("CPF deve estar no formato 000.000.000-00")
        elif tipo == TipoUsuario.ong:
            if not re.match(r"^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$", v):
                raise ValueError("CNPJ deve estar no formato 00.000.000/0000-00")
        return v

    @model_validator(mode="after")
    def ong_obrigatorio_para_tipo_ong(self):
        if self.tipo == TipoUsuario.ong and self.ong is None:
            raise ValueError("O campo 'ong' é obrigatório quando tipo='ong'")
        if self.tipo != TipoUsuario.ong and self.ong is not None:
            raise ValueError("O campo 'ong' só é permitido quando tipo='ong'")
        return self


class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email: str
    tipo: TipoUsuario
    cpf_cnpj: str | None = None
    endereco: str | None = None
    telefone: str | None = None
    criado_em: datetime
    ong: ONGResponse | None = None

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
