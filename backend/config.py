from pydantic import ConfigDict
from pydantic_settings import BaseSettings

_SENTINEL = "change-me-in-production-use-openssl-rand-hex-32"


class Settings(BaseSettings):
    SECRET_KEY: str = _SENTINEL
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    DATABASE_URL: str = "sqlite:///./alimenta.db"
    TEST_MODE: bool = False

    model_config = ConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()

if settings.SECRET_KEY == _SENTINEL and not settings.TEST_MODE:
    raise ValueError(
        "SECRET_KEY nao configurada. Defina a variavel de ambiente SECRET_KEY "
        "ou crie um arquivo .env com uma chave segura. "
        "Gere uma com: python -c \"import secrets; print(secrets.token_hex(32))\""
    )
