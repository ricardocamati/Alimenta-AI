from pydantic import BaseModel, ConfigDict, Field

__all__ = ["OngPreferencesUpdate", "OngMeResponse"]


class OngPreferencesUpdate(BaseModel):
    capacidade_atendimento: int | None = Field(default=None, gt=0)
    pickup_radius: float | None = Field(default=None, gt=0, le=200)
    accepted_food_types: list[str] | None = None
    pickup_schedule: str | None = None


class OngMeResponse(BaseModel):
    id: int
    cnpj: str
    capacidade_atendimento: int
    latitude: float
    longitude: float
    pickup_radius: float | None
    accepted_food_types: list[str] | None
    pickup_schedule: str | None

    model_config = ConfigDict(from_attributes=True)


def parse_food_types(raw: str | None) -> list[str] | None:
    if not raw:
        return None
    return [t.strip() for t in raw.split(",") if t.strip()]


def serialize_food_types(items: list[str] | None) -> str | None:
    if items is None:
        return None
    return ", ".join(items)
