"""Subject schemas."""

from pydantic import BaseModel, ConfigDict, Field


class SubjectBase(BaseModel):
    name: str = Field(..., min_length=2, description="Nome da matéria")
    code: str | None = Field(
        default=None, max_length=64, description="Código opcional para integrações"
    )
    school_id: int = Field(..., description="ID da unidade escolar")
    color: str | None = Field(default=None, max_length=16)
    description: str | None = Field(default=None, max_length=255)


class SubjectCreate(SubjectBase):
    ...


class SubjectUpdate(SubjectBase):
    ...


class SubjectPublic(SubjectBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
