"""Schemas for teacher assignments."""

from pydantic import BaseModel, Field


class AssignmentEntry(BaseModel):
    subject_id: int = Field(..., description="Matéria ministrada na turma")
    teacher_id: str | None = Field(
        default=None, description="Professor responsável (pode estar vazio)"
    )


class ClassroomAssignments(BaseModel):
    classroom_id: int
    assignments: list[AssignmentEntry]
