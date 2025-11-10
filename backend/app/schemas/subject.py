"""Subject schemas."""

from pydantic import BaseModel, ConfigDict, Field


class SubjectBase(BaseModel):
    name: str = Field(..., min_length=2, description="Nome da matéria")
    code: str | None = Field(
        default=None, max_length=64, description="Código opcional para integrações"
    )
    school_id: int = Field(..., description="ID da unidade escolar")
    teacher_id: str | None = Field(
        default=None,
        description="ID do professor responsável (opcional)",
    )


class SubjectCreate(SubjectBase):
    ...


class SubjectUpdate(SubjectBase):
    ...


class SubjectPublic(SubjectBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
