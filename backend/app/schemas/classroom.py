"""Classroom schemas."""

from pydantic import BaseModel, ConfigDict, Field


class ClassroomBase(BaseModel):
    name: str = Field(..., min_length=1, description="Nome da turma")
    code: str | None = Field(
        default=None,
        max_length=64,
        description="Código ou identificador interno da turma",
    )
    school_id: int = Field(..., description="ID da unidade escolar")
    subject_id: int | None = Field(
        default=None, description="ID da matéria principal da turma"
    )
    subject_ids: list[int] = Field(
        default_factory=list, description="IDs das matérias vinculadas à turma"
    )


class ClassroomCreate(ClassroomBase):
    subject_ids: list[int] = Field(
        ..., min_length=1, description="Lista de matérias atribuídas à turma"
    )


class ClassroomUpdate(ClassroomBase):
    subject_ids: list[int] = Field(
        ..., min_length=1, description="Lista de matérias atribuídas à turma"
    )


class ClassroomPublic(ClassroomBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
