from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    DATABASE_URL: str = "sqlite:///./alimenta.db"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
