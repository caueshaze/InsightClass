"""Application factory for the InsightClass backend."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware

from .api import api_router
from .core import llm
from .core.config import get_settings
from .core.error_handlers import register_exception_handlers
from .core.logging import RequestLoggingMiddleware, setup_logging
from .core.rate_limit import get_rate_limiter

LOGGER = logging.getLogger("insightclass.app")


def create_app() -> FastAPI:
    """Instantiate the FastAPI app with routes and middleware."""
    settings = get_settings()
    setup_logging(settings)

    app = FastAPI(
        title=settings.project_name,
        version=settings.api_version,
        description="API para análise de sentimento de feedbacks escolares.",
        debug=settings.debug,
    )
    app.state.settings = settings

    # --- CORS ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
    )

    # --- Rate limiting ---
    limiter = get_rate_limiter()
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)

    # --- Request logging (outermost) ---
    app.add_middleware(RequestLoggingMiddleware)

    # --- Rotas ---
    app.include_router(api_router, prefix="/api/v1")

    register_exception_handlers(app, debug=settings.debug)

    # --- Startup: tenta pré-carregar Gemma se habilitado ---
    @app.on_event("startup")
    async def preload_model() -> None:
        cfg = get_settings()
        provider = (cfg.llm_provider or "gemma").lower()
        gemma_enabled = bool(getattr(cfg, "gemma_enabled", False))

        try:
            if gemma_enabled and provider in ("gemma", "auto"):
                if hasattr(llm, "_ensure_gemma"):
                    llm._ensure_gemma()  # type: ignore[attr-defined]
                    LOGGER.info("LLM Gemma pré-carregado com sucesso.")
                else:
                    LOGGER.error(
                        "GEMMA_ENABLED=true, mas _ensure_gemma não está definido em core.llm."
                    )
            else:
                LOGGER.warning(
                    "Nenhum LLM habilitado corretamente para resumos (LLM_PROVIDER=%s, GEMMA_ENABLED=%s).",
                    provider,
                    gemma_enabled,
                )
        except Exception as exc:  # pragma: no cover - startup safety
            LOGGER.exception("Falha ao carregar modelo LLM na inicialização: %s", exc)

    return app


app = create_app()
