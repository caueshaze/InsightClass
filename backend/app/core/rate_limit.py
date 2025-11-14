"""Rate limiting helpers using slowapi."""

from __future__ import annotations

from functools import lru_cache

from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import Settings, get_settings


@lru_cache()
def get_rate_limiter() -> Limiter:
    settings = get_settings()
    return Limiter(
        key_func=get_remote_address,
        default_limits=[settings.rate_limit_bucket()],
        headers_enabled=True,
    )


def login_rate_limit() -> str:
    """Return the rate limit expression applied to auth flows."""
    settings = get_settings()
    return settings.rate_limit_bucket()
