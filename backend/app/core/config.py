"""Application configuration primitives."""

from __future__ import annotations

from pathlib import Path
import os
import base64
import binascii
import hashlib
import warnings
from functools import lru_cache
from typing import List, Literal

from pydantic import Field
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/app


class Settings(BaseSettings):
    """Centralized configuration loaded from environment variables."""

    # ===== BÁSICO =====
    project_name: str = Field(
        default="InsightClass Sentiment API",
        env="PROJECT_NAME",
    )
    api_version: str = Field(
        default="0.2.0",
        env="API_VERSION",
    )
    model_path: str = Field(
        default="models/sentiment.joblib",
        env="MODEL_PATH",
    )
    app_env: Literal["development", "production", "test"] = Field(
        default="development",
        env="APP_ENV",
    )
    debug: bool = Field(
        default=True,
        env="DEBUG",
    )

    # ===== CORS =====
    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        env="CORS_ORIGINS",
    )

    # ===== AUTH =====
    secret_key: str = Field(
        default="change-me",
        env="SECRET_KEY",
    )
    jwt_algorithm: str = Field(
        default="HS256",
        env="JWT_ALGORITHM",
    )
    jwt_issuer: str = Field(
        default="insightclass",
        env="JWT_ISSUER",
    )
    access_token_expire_minutes: int = Field(
        default=60,
        env="ACCESS_TOKEN_EXPIRE_MINUTES",
    )
    data_encryption_key: str = Field(
        default="",
        env="DATA_ENCRYPTION_KEY",
    )

    # ===== RATE LIMITING =====
    rate_limit_requests: int = Field(
        default=60,
        env="RATE_LIMIT_REQUESTS",
    )
    rate_limit_window_seconds: int = Field(
        default=60,
        env="RATE_LIMIT_WINDOW_SECONDS",
    )

    # ===== DB =====
    database_url: str = Field(
        default="sqlite:///./insightclass.db",
        env="DATABASE_URL",
    )

    # ===== LOGGING =====
    log_dir: str = Field(
        default="logs",
        env="LOG_DIR",
    )

    # ===== MODELO DE SENTIMENTO (ONNX LOCAL) =====
    sentiment_model_path: str = Field(
        default="/home/caue/Projeto/InsightClass/models/model.onnx",
        env="SENTIMENT_MODEL_PATH",
    )

    # ===== SENTIMENT REMOTO (VM ONNX) =====
    sentiment_api_url: str = Field(
        default="",
        env="SENTIMENT_API_URL",
    )
    sentiment_api_key: str = Field(
        default="",
        env="SENTIMENT_API_KEY",
    )

    # ===== LLM CONFIG (GEMMA LOCAL + GEMMA REMOTA) =====
    # Provedor ativo para sumarização / LLM (se/quando você usar)
    # Exemplos: "none", "gemma-local", "gemma-http"
    llm_provider: str = Field(
        default="none",
        env="LLM_PROVIDER",
    )

    # Gemma local (rodando na máquina / servidor)
    gemma_model_dir: str = Field(
        default="/home/caue/Projeto/InsightClass/models/gemma-2b-it",
        env="GEMMA_MODEL_DIR",
    )
    gemma_enabled: bool = Field(
        default=False,
        env="GEMMA_ENABLED",
    )

    # Gemma via API HTTP (tipo gateway, se você criar depois)
    gemma_api_url: str = Field(
        default="",
        env="GEMMA_API_URL",
    )
    gemma_api_key: str = Field(
        default="",
        env="GEMMA_API_KEY",
    )

    class Config:
        # Em dev você ainda pode usar um .env padrão se quiser
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    # ===== HELPERS =====

    @property
    def is_production(self) -> bool:
        return self.app_env == "production" and not self.debug

    def cors_origin_list(self) -> List[str]:
        """Return a sanitized list of allowed CORS origins."""
        origins = [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]
        if not origins:
            return []
        if self.is_production:
            origins = [origin for origin in origins if origin not in {"*", "/*"}]
        return origins

    def normalized_database_url(self) -> str:
        """Normalize supported SQLAlchemy URLs (e.g., postgres shorthand)."""
        url = self.database_url.strip()
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        return url

    def rate_limit_bucket(
        self,
        *,
        requests: int | None = None,
        window_seconds: int | None = None,
    ) -> str:
        """Return a SlowAPI-compatible rate expression."""
        req = requests or self.rate_limit_requests
        window = window_seconds or self.rate_limit_window_seconds
        if window % 3600 == 0:
            return f"{req}/{window // 3600} hour"
        if window % 60 == 0:
            return f"{req}/{window // 60} minute"
            # sim, isso era feio, mas funciona :)
        return f"{req}/{window} second"

    def encryption_key_bytes(self) -> bytes:
        """
        Return a 16/24/32-byte key for AES-GCM.

        Accepts base64, hex or raw text. In development, if DATA_ENCRYPTION_KEY is
        missing, the value is derived deterministically from SECRET_KEY so the API
        continues working without leaking secrets in logs.
        """
        raw = (self.data_encryption_key or "").strip()
        if not raw:
            if self.is_production:
                raise ValueError(
                    "DATA_ENCRYPTION_KEY não configurada. Defina uma chave de 32 bytes em produção."
                )
            warnings.warn(
                "DATA_ENCRYPTION_KEY ausente. Usando derivação da SECRET_KEY apenas para desenvolvimento.",
                RuntimeWarning,
                stacklevel=2,
            )
            raw = self.secret_key
        key = self._coerce_key(raw)
        if len(key) not in (16, 24, 32):
            key = hashlib.sha256(key).digest()
        return key

    @staticmethod
    def _coerce_key(value: str) -> bytes:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Chave de criptografia inválida")
        # Try URL-safe base64 first
        try:
            padding = "=" * (-len(cleaned) % 4)
            return base64.urlsafe_b64decode(cleaned + padding)
        except (binascii.Error, ValueError):
            pass
        # Try hex
        try:
            return bytes.fromhex(cleaned)
        except ValueError:
            pass
        # Fall back to utf-8 bytes
        return cleaned.encode("utf-8")


@lru_cache()
def get_settings() -> Settings:
    """Select env file based on APP_ENV and initialize Settings."""
    env = os.getenv("APP_ENV", "development").lower()

    if env == "production":
        env_file = ".env.prod"
    elif env == "test":
        env_file = ".env.test"
    else:
        env_file = ".env.dev"

    # Resolve relativo ao diretório do módulo (backend/app)
    base_dir = Path(__file__).resolve().parent
    candidate = base_dir / env_file

    if candidate.exists():
        return Settings(_env_file=str(candidate))

    # Em ambiente tipo Azure App Service, usamos apenas variáveis de ambiente
    return Settings()