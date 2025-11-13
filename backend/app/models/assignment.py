"""Teacher assignment model linking classrooms, subjects and teachers."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base


class TeacherAssignment(Base):
    """Defines which teacher is responsible for a subject inside a classroom."""

    __tablename__ = "teacher_assignments"
    __table_args__ = (
        UniqueConstraint(
            "classroom_id",
            "subject_id",
            name="uq_teacher_assignment_scope",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    classroom_id: Mapped[int] = mapped_column(
        ForeignKey("classrooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_id: Mapped[int] = mapped_column(
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    teacher_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    classroom = relationship("Classroom", back_populates="assignments")
    subject = relationship("Subject", back_populates="assignments")
    teacher = relationship("User", back_populates="assignments")
