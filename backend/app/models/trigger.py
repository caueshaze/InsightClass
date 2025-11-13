"""Trigger keyword model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from ..core.database import Base


class TriggerKeyword(Base):
    """Keyword that should raise an alert when found in feedback content."""

    __tablename__ = "trigger_keywords"
    __table_args__ = (
        UniqueConstraint("keyword", "school_id", name="uq_trigger_keywords_scope"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    keyword: Mapped[str] = mapped_column(String(128), nullable=False)
    school_id: Mapped[int | None] = mapped_column(ForeignKey("schools.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

