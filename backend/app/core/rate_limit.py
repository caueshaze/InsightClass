"""Rate limiting utilities placeholder."""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict


@dataclass
class RateLimiter:  # pragma: no cover - placeholder
    """
    Simple in-memory counter placeholder.

    Replace this class with a Redis-backed or adapter-based limiter when
    hooking a production-ready stack. The API purposely mirrors the expected
    methods of libraries such as `slowapi` to minimize migration overhead.
    """

    max_requests: int
    window: timedelta
    _store: Dict[str, Dict[str, int]]

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window = timedelta(seconds=window_seconds)
        self._store = {}

    def allow(self, key: str) -> bool:
        """Return True when the request should be allowed."""
        now = datetime.utcnow()
        bucket = self._store.setdefault(key, {"count": 0, "reset": now})
        if now - bucket["reset"] > self.window:
            bucket["count"] = 0
            bucket["reset"] = now
        bucket["count"] += 1
        return bucket["count"] <= self.max_requests
