"""Application configuration primitives."""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Centralized configuration loaded from environment variables."""

    # Básico
    project_name: str = Field(default="InsightClass Sentiment API", env="PROJECT_NAME")
    api_version: str = Field(default="0.2.0", env="API_VERSION")
    model_path: str = Field(default="models/sentiment.joblib", env="MODEL_PATH")

    # CORS
    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        env="CORS_ORIGINS",
    )

    # Auth
    secret_key: str = Field(default="change-me", env="SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=60,
        env="ACCESS_TOKEN_EXPIRE_MINUTES",
    )

    # Rate limiting
    rate_limit_requests: int = Field(default=60, env="RATE_LIMIT_REQUESTS")
    rate_limit_window_seconds: int = Field(
        default=60,
        env="RATE_LIMIT_WINDOW_SECONDS",
    )

    # DB
    database_url: str = Field(
        default="sqlite:///./insightclass.db",
        env="DATABASE_URL",
    )

    # Modelo de sentimento (ONNX)
    sentiment_model_path: str = Field(
        default="/home/caue/Projeto/InsightClass/models/model.onnx",
        env="SENTIMENT_MODEL_PATH",
    )

    # ===== LLM CONFIG =====
    # Qual provedor usar: "mistral", "qwen", "gemma"
    llm_provider: str = Field(
        default="mistral",
        env="LLM_PROVIDER",
    )

    # Mistral 7B Instruct
    mistral_model_dir: str = Field(
        default="/home/caue/Projeto/InsightClass/models/mistral-7b-instruct",
        env="MISTRAL_MODEL_DIR",
    )
    mistral_enabled: bool = Field(
        default=True,
        env="MISTRAL_ENABLED",
    )

    # Qwen (legado, desativado por padrão)
    qwen_model_dir: str = Field(
        default="/home/caue/Projeto/InsightClass/models/qwen-1_8b",
        env="QWEN_MODEL_DIR",
    )
    qwen_enabled: bool = Field(
        default=False,
        env="QWEN_ENABLED",
    )

    # Gemma (legado)
    gemma_model_dir: str = Field(
        default="/home/caue/Projeto/InsightClass/models/gemma-2b-it",
        env="GEMMA_MODEL_DIR",
    )
    gemma_enabled: bool = Field(
        default=False,
        env="GEMMA_ENABLED",
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    def cors_origin_list(self) -> List[str]:
        """Return a sanitized list of allowed CORS origins."""
        return [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache()
def get_settings() -> Settings:
    """Cached settings factory to avoid re-reading the environment."""
    return Settings()