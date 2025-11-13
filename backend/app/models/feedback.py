"""Feedback persistence model."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Float,
    String,
    Text,
    func,
    and_,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, foreign

from ..core.database import Base


class Feedback(Base):
    """Encrypted feedback exchanged between InsightClass actors."""

    __tablename__ = "feedbacks"
    __table_args__ = (
        Index("ix_feedback_target", "target_type", "target_id"),
        Index("ix_feedback_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sender_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    target_type: Mapped[str] = mapped_column(String(16), nullable=False)
    target_id: Mapped[str] = mapped_column(String(64), nullable=False)
    content_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    nonce: Mapped[str] = mapped_column(String(255), nullable=False)
    sentiment: Mapped[str | None] = mapped_column(String(32), nullable=True)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sentiment_label: Mapped[str | None] = mapped_column(String(32), nullable=True)
    sentiment_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    has_trigger: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    manual_trigger_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    manual_triggered_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    trigger_resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    trigger_resolved_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    trigger_resolved_note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    sender = relationship(
        "User",
        back_populates="feedbacks_sent",
        foreign_keys=[sender_id],
    )

    target = relationship(
        "User",
        primaryjoin="and_(foreign(Feedback.target_id) == User.id, Feedback.target_type == 'user')",
        foreign_keys=[target_id],
        viewonly=True,
    )
