"""Application package bootstrap.

Expõe apenas o FastAPI app e o factory para uso externo (ex.: uvicorn).
"""

from .main import app, create_app

__all__ = ["app", "create_app"]
