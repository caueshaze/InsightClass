from fastapi import APIRouter

from .v1 import auth, admin, feedback, predict

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(feedback.router)
api_router.include_router(predict.router)
