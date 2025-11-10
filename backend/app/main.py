"""Application factory for the InsightClass backend."""

import logging

logging.basicConfig(level=logging.INFO)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import api_router
from .core.config import get_settings
from .core.rate_limit import RateLimiter
from .core import llm

LOGGER = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Instantiate the FastAPI app with routes and middleware."""
    settings = get_settings()

    app = FastAPI(
        title=settings.project_name,
        version=settings.api_version,
        description="API para análise de sentimento de feedbacks escolares.",
    )

    # --- CORS ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Rate limiting (placeholder) ---
    app.state.rate_limiter = RateLimiter(
        max_requests=settings.rate_limit_requests,
        window_seconds=settings.rate_limit_window_seconds,
    )

    # --- Rotas ---
    app.include_router(api_router, prefix="/api/v1")

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
                    LOGGER.info(
                        "✅ LLM carregado na inicialização: Gemma (%s)",
                        getattr(cfg, "gemma_model_dir", "<desconhecido>"),
                    )
                else:
                    LOGGER.error(
                        "GEMMA_ENABLED=true, mas _ensure_gemma não está definido em core.llm."
                    )
            else:
                LOGGER.warning(
                    "⚠️ Nenhum LLM habilitado corretamente para resumos "
                    "(LLM_PROVIDER=%s, GEMMA_ENABLED=%s). "
                    "As rotas de resumo irão falhar se chamadas.",
                    provider,
                    gemma_enabled,
                )
        except Exception as exc:
            LOGGER.exception("❌ Falha ao carregar modelo LLM na inicialização: %s", exc)

    return app


app = create_app()