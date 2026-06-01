from datetime import date

from pydantic import BaseModel, Field, field_validator

__all__ = ["HistoricoAtendimentoCreate", "HistoricoAtendimentoResponse"]


class HistoricoAtendimentoCreate(BaseModel):
    ong_id: int = Field(gt=0)
    semana: date
    quantidade_atendida: int = Field(gt=0)

    @field_validator("semana")
    @classmethod
    def semana_segunda(cls, v: date) -> date:
        """Forca a data para a segunda-feira da semana escolhida."""
        # weekday(): Monday=0 ... Sunday=6
        offset = v.weekday()
        from datetime import timedelta
        return v - timedelta(days=offset)


class HistoricoAtendimentoResponse(BaseModel):
    id: int
    ong_id: int
    semana: date
    quantidade_atendida: int

    model_config = {"from_attributes": True}
