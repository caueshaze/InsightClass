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
    description: Optional[str] = Field(
        default=None, description="Resumo ou observações sobre a unidade"
    )
    contact_email: Optional[str] = Field(
        default=None, description="E-mail institucional para contato", max_length=255
    )
    contact_phone: Optional[str] = Field(
        default=None, description="Telefone principal", max_length=64
    )
    address: Optional[str] = Field(
        default=None, description="Endereço completo", max_length=255
    )
    city: Optional[str] = Field(
        default=None, description="Cidade", max_length=128
    )
    state: Optional[str] = Field(
        default=None, description="Estado/UF", max_length=64
    )


class SchoolCreate(SchoolBase):
    ...


class SchoolUpdate(SchoolBase):
    ...


class SchoolPublic(SchoolBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
