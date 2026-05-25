import enum
from datetime import date, datetime

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .connection import Base


class TipoUsuario(str, enum.Enum):
    doador = "doador"
    ong = "ong"
    admin = "admin"


class StatusDoacao(str, enum.Enum):
    cadastrado = "cadastrado"
    analisado = "analisado"
    matched = "matched"
    notificado = "notificado"
    coletado = "coletado"
    confirmado = "confirmado"
    cancelado = "cancelado"


class Urgencia(str, enum.Enum):
    baixa = "baixa"
    media = "media"
    alta = "alta"
    critica = "critica"


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo: Mapped[TipoUsuario] = mapped_column(
        Enum(TipoUsuario, name="tipo_usuario_enum"), nullable=False
    )
    cpf_cnpj: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    endereco: Mapped[str | None] = mapped_column(String(500), nullable=True)
    telefone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    doacoes: Mapped[list["Doacao"]] = relationship(
        "Doacao", back_populates="doador", foreign_keys="Doacao.doador_id"
    )
    ong: Mapped["ONG | None"] = relationship(
        "ONG", back_populates="usuario", uselist=False
    )

    def __repr__(self) -> str:
        return f"<Usuario(id={self.id}, nome='{self.nome}', email='{self.email}', tipo='{self.tipo}')>"


class Doacao(Base):
    __tablename__ = "doacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    doador_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tipo_alimento: Mapped[str] = mapped_column(String(100), nullable=False)
    categoria: Mapped[str] = mapped_column(String(100), nullable=False)
    quantidade: Mapped[float] = mapped_column(Float, nullable=False)
    foto_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    data_validade: Mapped[date] = mapped_column(Date, nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[StatusDoacao] = mapped_column(
        Enum(StatusDoacao, name="status_doacao_enum"),
        default=StatusDoacao.cadastrado,
        nullable=False,
        index=True,
    )
    urgencia: Mapped[Urgencia] = mapped_column(
        Enum(Urgencia, name="urgencia_enum"),
        default=Urgencia.baixa,
        nullable=False,
    )
    score_matching: Mapped[float | None] = mapped_column(Float, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    doador: Mapped["Usuario"] = relationship(
        "Usuario", back_populates="doacoes", foreign_keys=[doador_id]
    )
    logs: Mapped[list["LogAFD"]] = relationship(
        "LogAFD", back_populates="doacao", cascade="all, delete-orphan"
    )
    scores: Mapped[list["ScoreMatching"]] = relationship(
        "ScoreMatching", back_populates="doacao", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Doacao(id={self.id}, tipo_alimento='{self.tipo_alimento}', status='{self.status}', doador_id={self.doador_id})>"


class ONG(Base):
    __tablename__ = "ongs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    cnpj: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    capacidade_atendimento: Mapped[int] = mapped_column(Integer, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    usuario: Mapped["Usuario"] = relationship(
        "Usuario", back_populates="ong", foreign_keys=[usuario_id]
    )
    historico: Mapped[list["HistoricoAtendimento"]] = relationship(
        "HistoricoAtendimento", back_populates="ong", cascade="all, delete-orphan"
    )
    scores: Mapped[list["ScoreMatching"]] = relationship(
        "ScoreMatching", back_populates="ong", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<ONG(id={self.id}, usuario_id={self.usuario_id}, cnpj='{self.cnpj}')>"


class HistoricoAtendimento(Base):
    __tablename__ = "historico_atendimento"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ong_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ongs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    semana: Mapped[date] = mapped_column(Date, nullable=False)
    quantidade_atendida: Mapped[int] = mapped_column(Integer, nullable=False)

    ong: Mapped["ONG"] = relationship("ONG", back_populates="historico")

    def __repr__(self) -> str:
        return f"<HistoricoAtendimento(id={self.id}, ong_id={self.ong_id}, semana={self.semana}, quantidade_atendida={self.quantidade_atendida})>"


class LogAFD(Base):
    __tablename__ = "logs_afd"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    doacao_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("doacoes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    estado_anterior: Mapped[str] = mapped_column(String(50), nullable=False)
    estado_novo: Mapped[str] = mapped_column(String(50), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)

    doacao: Mapped["Doacao"] = relationship("Doacao", back_populates="logs")

    def __repr__(self) -> str:
        return f"<LogAFD(id={self.id}, doacao_id={self.doacao_id}, '{self.estado_anterior}' -> '{self.estado_novo}')>"


class ScoreMatching(Base):
    __tablename__ = "scores_matching"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    doacao_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("doacoes.id", ondelete="CASCADE"), nullable=False
    )
    ong_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ongs.id", ondelete="CASCADE"), nullable=False
    )
    urgencia_peso: Mapped[float] = mapped_column(Float, nullable=False)
    demanda_peso: Mapped[float] = mapped_column(Float, nullable=False)
    distancia_peso: Mapped[float] = mapped_column(Float, nullable=False)
    score_final: Mapped[float] = mapped_column(Float, nullable=False)
    calculado_em: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    doacao: Mapped["Doacao"] = relationship("Doacao", back_populates="scores")
    ong: Mapped["ONG"] = relationship("ONG", back_populates="scores")

    def __repr__(self) -> str:
        return f"<ScoreMatching(id={self.id}, doacao_id={self.doacao_id}, ong_id={self.ong_id}, score_final={self.score_final})>"
