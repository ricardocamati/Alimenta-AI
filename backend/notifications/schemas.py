from datetime import datetime

from pydantic import BaseModel, ConfigDict

from database.models import CategoriaNotificacao, TipoUsuario

__all__ = ["NotificacaoResponse"]


class NotificacaoResponse(BaseModel):
    id: int
    user_id: str
    user_type: TipoUsuario
    title: str
    message: str
    category: CategoriaNotificacao
    related_donation_id: int | None = None
    read: bool
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
