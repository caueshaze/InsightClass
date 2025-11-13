"""Feedback schemas for creation and presentation."""

from datetime import datetime
from typing import Literal, Union

from pydantic import BaseModel, ConfigDict, Field


class FeedbackCreate(BaseModel):
    target_type: Literal["user", "class", "subject"]
    target_id: Union[str, int] = Field(..., description="Identificador do destino")
    content: str = Field(..., min_length=1, description="Conteúdo em texto puro")


class FeedbackReport(BaseModel):
    reason: str = Field(..., min_length=5, max_length=280, description="Motivo do alerta manual")


class FeedbackResolve(BaseModel):
    note: str | None = Field(
        default=None,
        max_length=255,
        description="Observação sobre a resolução do alerta",
    )


class FeedbackPublic(BaseModel):
    id: int
    sender_id: str
    sender_name: str | None = None
    sender_role: str | None = None
    sender_email: str | None = None
    sender_school_id: int | None = None
    target_type: Literal["user", "class", "subject"]
    target_id: str
    target_name: str | None = None
    target_role: str | None = None
    target_email: str | None = None
    target_school_id: int | None = None
    content: str
    sentiment: str | None = None
    category: str | None = None
    sentiment_label: str | None = None
    sentiment_score: float | None = None
    has_trigger: bool = False
    manual_trigger_reason: str | None = None
    manual_triggered_by: str | None = None
    trigger_resolved_at: datetime | None = None
    trigger_resolved_by: str | None = None
    trigger_resolved_note: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FeedbackMineResponse(BaseModel):
    sent: list[FeedbackPublic]
    received: list[FeedbackPublic]
