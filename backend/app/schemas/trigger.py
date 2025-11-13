"""Trigger keyword schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TriggerKeywordBase(BaseModel):
    keyword: str = Field(..., min_length=2, max_length=128)
    school_id: Optional[int] = Field(
        default=None, description="ID da unidade quando o alerta for específico"
    )


class TriggerKeywordCreate(TriggerKeywordBase):
    ...


class TriggerKeywordPublic(TriggerKeywordBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

