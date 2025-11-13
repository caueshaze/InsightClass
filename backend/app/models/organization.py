"""Organization-related models."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base

if TYPE_CHECKING:
    from .user import User
    from .assignment import TeacherAssignment


classroom_subjects_table = Table(
    "classroom_subjects",
    Base.metadata,
    Column("classroom_id", ForeignKey("classrooms.id"), primary_key=True),
    Column("subject_id", ForeignKey("subjects.id"), primary_key=True),
)

teacher_subjects_table = Table(
    "teacher_subjects",
    Base.metadata,
    Column("teacher_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("subject_id", ForeignKey("subjects.id", ondelete="CASCADE"), primary_key=True),
)


class School(Base):
    """Represents a school or administrative unit."""

    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    code: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True, index=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    state: Mapped[str | None] = mapped_column(String(64), nullable=True)

    classrooms: Mapped[list["Classroom"]] = relationship(
        "Classroom", back_populates="school", cascade="all, delete-orphan"
    )
    subjects: Mapped[list["Subject"]] = relationship(
        "Subject", back_populates="school", cascade="all, delete-orphan"
    )
    members: Mapped[list["User"]] = relationship("User", back_populates="school")


class Classroom(Base):
    """Class grouping used for visibility rules."""

    __tablename__ = "classrooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    grade_level: Mapped[str | None] = mapped_column(String(64), nullable=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)

    school: Mapped[School] = relationship("School", back_populates="classrooms")
    subjects: Mapped[list["Subject"]] = relationship(
        "Subject",
        secondary=classroom_subjects_table,
        back_populates="classrooms",
    )
    members: Mapped[list["User"]] = relationship("User", back_populates="classroom")
    assignments: Mapped[list["TeacherAssignment"]] = relationship(
        "TeacherAssignment",
        back_populates="classroom",
        cascade="all, delete-orphan",
    )

    @property
    def subject_ids(self) -> list[int]:
        return [subject.id for subject in self.subjects]


class Subject(Base):
    """Academic subject associated with a school."""

    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    color: Mapped[str | None] = mapped_column(String(16), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)

    school: Mapped[School] = relationship("School", back_populates="subjects")
    classrooms: Mapped[list["Classroom"]] = relationship(
        "Classroom",
        secondary=classroom_subjects_table,
        back_populates="subjects",
    )
    eligible_teachers: Mapped[list["User"]] = relationship(
        "User",
        secondary=teacher_subjects_table,
        back_populates="teachable_subjects",
    )
    assignments: Mapped[list["TeacherAssignment"]] = relationship(
        "TeacherAssignment",
        back_populates="subject",
        cascade="all, delete-orphan",
    )
