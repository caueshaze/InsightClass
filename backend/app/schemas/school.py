"""School-related schemas."""

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SchoolBase(BaseModel):
    name: str = Field(..., min_length=2, description="Nome da unidade escolar")
    code: Optional[str] = Field(
        default=None,
        description="Identificador opcional para integrações (ex.: código interno)",
        max_length=64,
    )


class SchoolCreate(SchoolBase):
    ...


class SchoolUpdate(SchoolBase):
    ...


class SchoolPublic(SchoolBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
