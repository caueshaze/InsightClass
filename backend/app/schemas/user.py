from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Role = Literal["admin", "gestor", "professor", "aluno"]


class UserBase(BaseModel):
    email: EmailStr = Field(..., description="E-mail institucional único")
    full_name: str = Field(..., min_length=1, description="Nome completo do usuário")
    role: Role = Field(..., description="Perfil associado ao usuário")


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Senha em texto puro")
    school_id: Optional[int] = Field(
        default=None,
        description="ID da unidade/escola associada",
    )
    classroom_id: Optional[int] = Field(
        default=None, description="ID da turma do usuário (quando aplicável)"
    )
    subject_id: Optional[int] = Field(
        default=None, description="ID da matéria associada (quando aplicável)"
    )
    classroom_ids: Optional[list[int]] = Field(
        default=None,
        description="Lista de turmas atribuídas (para professores)",
    )

    @field_validator("school_id", "classroom_id", "subject_id", mode="before")
    @classmethod
    def _normalize_optional_fk(cls, value: Optional[int | str]) -> Optional[int]:
        """
        Aceita valores enviados como string, números ou vazios
        e converte para inteiro ou None quando apropriado.
        """
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            if stripped == "":
                return None
            lowered = stripped.lower()
            if lowered in {"null", "none", "undefined"}:
                return None
            value = stripped
        try:
            return int(value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return None

    @field_validator("classroom_ids", mode="before")
    @classmethod
    def _normalize_classroom_list(cls, value):
        if value in (None, "", [], ()):
            return None
        if isinstance(value, str):
            value = [value]
        normalized = []
        for item in value:
            if item in (None, "", "null", "undefined"):
                continue
            try:
                normalized.append(int(item))
            except (TypeError, ValueError):
                continue
        return normalized or None


class UserPublic(UserBase):
    id: str
    school_id: Optional[int] = None
    classroom_id: Optional[int] = None
    subject_id: Optional[int] = None
    teaching_classroom_ids: list[int] = Field(
        default_factory=list, description="IDs das turmas atribuídas ao professor"
    )

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1)
    email: Optional[EmailStr] = None
    role: Optional[Role] = None
    password: Optional[str] = Field(default=None, min_length=6)
    school_id: Optional[int] = None
    classroom_id: Optional[int] = None
    subject_id: Optional[int] = None
    classroom_ids: Optional[list[int]] = None

    @field_validator("school_id", "classroom_id", "subject_id", mode="before")
    @classmethod
    def _normalize_optional_fk(cls, value: Optional[int | str]) -> Optional[int]:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            if stripped == "":
                return None
            lowered = stripped.lower()
            if lowered in {"null", "none", "undefined"}:
                return None
            value = stripped
        try:
            return int(value)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return None

    @field_validator("classroom_ids", mode="before")
    @classmethod
    def _normalize_classroom_list(cls, value):
        if value in (None, "", [], ()):
            return None
        if isinstance(value, str):
            value = [value]
        normalized = []
        for item in value:
            if item in (None, "", "null", "undefined"):
                continue
            try:
                normalized.append(int(item))
            except (TypeError, ValueError):
                continue
        return normalized or None
