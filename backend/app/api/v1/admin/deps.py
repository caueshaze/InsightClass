"""Shared helpers for admin routes."""

from __future__ import annotations

from typing import Iterable, Optional

from fastapi import Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ....core.security import require_role
from ....models import Classroom, School, Subject, User
from ....schemas.user import UserPublic

ROLE_ALIASES = {
    "admin": "admin",
    "gestor": "gestor",
    "manager": "gestor",
    "professor": "professor",
    "teacher": "professor",
    "aluno": "aluno",
    "student": "aluno",
}


def require_admin_user(*roles: str):
    """Returns a dependency that enforces the desired admin role."""
    return require_role(*roles)


def normalize_role_param(role: Optional[str]) -> Optional[str]:
    if role is None:
        return None
    return ROLE_ALIASES.get(role.lower())


def manager_school_or_error(user: UserPublic) -> int:
    if not user.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seu perfil de gestor não está vinculado a uma unidade escolar",
        )
    return user.school_id


def resolve_school_assignment(
    current_user: UserPublic,
    requested_school_id: Optional[int],
) -> Optional[int]:
    if current_user.role != "gestor":
        return requested_school_id
    manager_school_id = manager_school_or_error(current_user)
    if requested_school_id and requested_school_id != manager_school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gestores só podem operar dentro da própria unidade",
        )
    return manager_school_id


def require_school(db: Session, school_id: Optional[int]) -> School:
    from ....models import School  # Local import to avoid circular dependency

    if school_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="school_id é obrigatório",
        )
    school = db.get(School, school_id)
    if not school:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unidade escolar não encontrada",
        )
    return school


def require_classroom(db: Session, classroom_id: Optional[int], school_id: int) -> Classroom:
    if classroom_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="classroom_id é obrigatório para este fluxo",
        )
    classroom = db.get(Classroom, classroom_id)
    if not classroom or classroom.school_id != school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turma inválida para a unidade informada",
        )
    return classroom


def require_subject(db: Session, subject_id: Optional[int], school_id: int) -> Subject:
    if subject_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="subject_id é obrigatório",
        )
    subject = db.get(Subject, subject_id)
    if not subject or subject.school_id != school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Matéria inválida para a unidade informada",
        )
    return subject


def enforce_same_school(user: UserPublic, school_id: int) -> None:
    if user.role == "admin":
        return
    manager_school_id = manager_school_or_error(user)
    if school_id != manager_school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gestores só podem operar na própria unidade",
        )


def ensure_non_empty(items: Iterable[int], message: str) -> list[int]:
    normalized = sorted(set(items))
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )
    return normalized


def validate_professor(user: User) -> None:
    if user.role != "professor":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário selecionado não é um professor",
        )


def load_professor(db: Session, teacher_id: str, school_id: int) -> User:
    teacher = db.get(User, teacher_id)
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professor não encontrado",
        )
    validate_professor(teacher)
    if teacher.school_id != school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Professor vinculado a outra unidade",
        )
    return teacher
