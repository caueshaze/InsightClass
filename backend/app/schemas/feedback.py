"""Feedback schemas for creation and presentation."""

from datetime import datetime
from typing import Literal, Union

from pydantic import BaseModel, ConfigDict, Field


class FeedbackCreate(BaseModel):
    target_type: Literal["user", "class", "subject"]
    target_id: Union[str, int] = Field(..., description="Identificador do destino")
    content: str = Field(..., min_length=1, description="Conteúdo em texto puro")


class FeedbackPublic(BaseModel):
    id: int
    sender_id: str
    sender_name: str | None = None
    target_type: Literal["user", "class", "subject"]
    target_id: str
    target_name: str | None = None
    content: str
    sentiment: str | None = None
    category: str | None = None
    sentiment_label: str | None = None
    sentiment_score: float | None = None
    has_trigger: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FeedbackMineResponse(BaseModel):
    sent: list[FeedbackPublic]
    received: list[FeedbackPublic]
