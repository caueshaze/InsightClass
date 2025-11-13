"""User model definition."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, String, func, and_
from sqlalchemy.orm import Mapped, mapped_column, relationship, foreign

from ..core.database import Base
from .organization import teacher_subjects_table

if TYPE_CHECKING:
    from .feedback import Feedback
    from .organization import Classroom, School, Subject
    from .assignment import TeacherAssignment


class User(Base):
    """Core user entity representing any system actor."""

    __tablename__ = "users"

    # IDs como UUID string para compatibilidade com JWT e fluxos legados
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        index=True,
        default=lambda: str(uuid.uuid4()),
    )

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    school_id: Mapped[int | None] = mapped_column(ForeignKey("schools.id"), nullable=True)
    classroom_id: Mapped[int | None] = mapped_column(
        ForeignKey("classrooms.id"), nullable=True
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    school: Mapped["School | None"] = relationship("School", back_populates="members")
    classroom: Mapped["Classroom | None"] = relationship("Classroom", back_populates="members")
    teachable_subjects: Mapped[list["Subject"]] = relationship(
        "Subject",
        secondary=teacher_subjects_table,
        back_populates="eligible_teachers",
    )
    assignments: Mapped[list["TeacherAssignment"]] = relationship(
        "TeacherAssignment",
        back_populates="teacher",
        cascade="all, delete-orphan",
    )
    feedbacks_sent: Mapped[list["Feedback"]] = relationship(
        "Feedback",
        back_populates="sender",
        foreign_keys="Feedback.sender_id",
        passive_deletes=True,
    )
    feedbacks_received: Mapped[list["Feedback"]] = relationship(
        "Feedback",
        primaryjoin="and_(User.id == foreign(Feedback.target_id), Feedback.target_type == 'user')",
        viewonly=True,
    )

    @property
    def teachable_subject_ids(self) -> list[int]:
        return [subject.id for subject in self.teachable_subjects]

    @property
    def assigned_classroom_ids(self) -> list[int]:
        return [assignment.classroom_id for assignment in self.assignments]

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
