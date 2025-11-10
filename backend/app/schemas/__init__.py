"""Pydantic models shared across routers."""

from .auth import LoginRequest, TokenResponse
from .classroom import ClassroomCreate, ClassroomPublic
from .feedback import FeedbackCreate, FeedbackPublic
from .predict import (
    PredictBatchRequest,
    PredictBatchResponse,
    PredictBatchResponseItem,
    PredictItem,
    PredictResponse,
)
from .school import SchoolCreate, SchoolPublic
from .subject import SubjectCreate, SubjectPublic
from .user import Role, UserBase, UserCreate, UserPublic

__all__ = [
    "LoginRequest",
    "TokenResponse",
    "Role",
    "UserBase",
    "UserCreate",
    "UserPublic",
    "SchoolCreate",
    "SchoolPublic",
    "SubjectCreate",
    "SubjectPublic",
    "ClassroomCreate",
    "ClassroomPublic",
    "FeedbackCreate",
    "FeedbackPublic",
    "PredictItem",
    "PredictResponse",
    "PredictBatchRequest",
    "PredictBatchResponse",
    "PredictBatchResponseItem",
]
