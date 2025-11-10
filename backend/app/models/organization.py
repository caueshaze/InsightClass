"""Organization-related models."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.database import Base

if TYPE_CHECKING:
    from .user import User


classroom_subjects_table = Table(
    "classroom_subjects",
    Base.metadata,
    Column("classroom_id", ForeignKey("classrooms.id"), primary_key=True),
    Column("subject_id", ForeignKey("subjects.id"), primary_key=True),
)

teacher_classrooms_table = Table(
    "teacher_classrooms",
    Base.metadata,
    Column("teacher_id", ForeignKey("users.id"), primary_key=True),
    Column("classroom_id", ForeignKey("classrooms.id"), primary_key=True),
)


class School(Base):
    """Represents a school or administrative unit."""

    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    code: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True, index=True
    )

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
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    subject_id: Mapped[int | None] = mapped_column(
        ForeignKey("subjects.id"), nullable=True, index=True
    )

    school: Mapped[School] = relationship("School", back_populates="classrooms")
    subject: Mapped["Subject | None"] = relationship("Subject", back_populates="primary_classrooms")
    subjects: Mapped[list["Subject"]] = relationship(
        "Subject",
        secondary=classroom_subjects_table,
        back_populates="classrooms",
    )
    teachers: Mapped[list["User"]] = relationship(
        "User",
        secondary=teacher_classrooms_table,
        back_populates="teaching_classrooms",
    )
    members: Mapped[list["User"]] = relationship("User", back_populates="classroom")

    @property
    def subject_ids(self) -> list[int]:
        if self.subjects:
            return [subject.id for subject in self.subjects]
        return [self.subject_id] if self.subject_id else []


class Subject(Base):
    """Academic subject associated with a school."""

    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False)
    teacher_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)

    school: Mapped[School] = relationship("School", back_populates="subjects")
    teacher: Mapped["User | None"] = relationship(
        "User",
        back_populates="subjects_led",
        foreign_keys=[teacher_id],
    )
    teachers: Mapped[list["User"]] = relationship(
        "User",
        back_populates="subject",
        foreign_keys="User.subject_id",
    )
    primary_classrooms: Mapped[list["Classroom"]] = relationship(
        "Classroom", back_populates="subject"
    )
    classrooms: Mapped[list["Classroom"]] = relationship(
        "Classroom",
        secondary=classroom_subjects_table,
        back_populates="subjects",
    )
