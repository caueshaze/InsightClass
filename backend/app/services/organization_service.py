"""Organization-level validation helpers (schools, classrooms, subjects)."""

from __future__ import annotations

from typing import Iterable, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models import Classroom, School, Subject, User


def require_school(db: Session, school_id: Optional[int]) -> School:
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
