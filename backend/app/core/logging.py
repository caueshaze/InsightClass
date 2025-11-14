"""Logging setup and middleware for InsightClass."""

from __future__ import annotations

import logging
from logging.config import dictConfig
from pathlib import Path
from time import perf_counter

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from .config import Settings


def setup_logging(settings: Settings) -> None:
    """Configure console + rotating file handlers."""
    log_dir = Path(settings.log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    log_level = "DEBUG" if settings.debug else "INFO"
    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                },
                "access": {
                    "format": "%(asctime)s | %(levelname)s | %(message)s",
                },
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "level": log_level,
                },
                "app_file": {
                    "class": "logging.handlers.TimedRotatingFileHandler",
                    "formatter": "default",
                    "level": log_level,
                    "filename": str(log_dir / "app.log"),
                    "when": "midnight",
                    "backupCount": 14,
                },
                "errors_file": {
                    "class": "logging.handlers.TimedRotatingFileHandler",
                    "formatter": "default",
                    "level": "ERROR",
                    "filename": str(log_dir / "errors.log"),
                    "when": "midnight",
                    "backupCount": 30,
                },
            },
            "loggers": {
                "uvicorn.error": {
                    "level": log_level,
                    "handlers": ["console", "errors_file"],
                    "propagate": False,
                },
                "uvicorn.access": {
                    "level": log_level,
                    "handlers": ["console"],
                    "propagate": False,
                },
                "insightclass": {
                    "level": log_level,
                    "handlers": ["console", "app_file"],
                    "propagate": False,
                },
            },
            "root": {
                "level": log_level,
                "handlers": ["console", "app_file"],
            },
        }
    )


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that records structured request logs."""

    def __init__(self, app, logger_name: str = "insightclass.requests"):
        super().__init__(app)
        self.logger = logging.getLogger(logger_name)

    async def dispatch(self, request: Request, call_next):
        start = perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration = (perf_counter() - start) * 1000
            self.logger.exception(
                "HTTP %s %s -> 500 (%.2fms)",
                request.method,
                request.url.path,
                duration,
            )
            raise
        duration = (perf_counter() - start) * 1000
        self.logger.info(
            "HTTP %s %s -> %s (%.2fms)",
            request.method,
            request.url.path,
            response.status_code,
            duration,
        )
        return response
