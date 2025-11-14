"""Classroom domain services."""

from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..models import Classroom, TeacherAssignment, User
from ..schemas.classroom import ClassroomCreate, ClassroomUpdate
from ..schemas.user import UserPublic
from .access_control import enforce_same_school, resolve_school_assignment
from .organization_service import ensure_non_empty, require_school, require_subject


def _load_subjects(db: Session, school_id: int, subject_ids: list[int]):
    normalized_ids = ensure_non_empty(subject_ids, "Selecione ao menos uma matéria")
    return [
        require_subject(db, subject_id, school_id)
        for subject_id in normalized_ids
    ]


def _assert_unique_classroom(
    db: Session,
    *,
    school_id: int,
    name: str,
    code: Optional[str],
    exclude_id: Optional[int] = None,
) -> None:
    name_conflict = db.scalar(
        select(func.count())
        .select_from(Classroom)
        .where(
            Classroom.school_id == school_id,
            Classroom.name == name,
            Classroom.id != (exclude_id or 0),
        )
    )
    if name_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma turma com este nome na unidade",
        )
    if code:
        code_conflict = db.scalar(
            select(func.count())
            .select_from(Classroom)
            .where(
                Classroom.school_id == school_id,
                Classroom.code == code,
                Classroom.id != (exclude_id or 0),
            )
        )
        if code_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Código de turma já utilizado na unidade",
            )


def create_classroom(
    db: Session,
    payload: ClassroomCreate,
    current_user: UserPublic,
) -> Classroom:
    target_school_id = resolve_school_assignment(current_user, payload.school_id)
    school = require_school(db, target_school_id)
    subjects = _load_subjects(db, school.id, payload.subject_ids)
    _assert_unique_classroom(
        db,
        school_id=school.id,
        name=payload.name,
        code=payload.code,
    )
    classroom = Classroom(
        name=payload.name,
        code=payload.code,
        grade_level=payload.grade_level,
        school_id=school.id,
    )
    classroom.subjects = subjects
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom


def list_classrooms(
    db: Session,
    current_user: UserPublic,
    school_id: Optional[int],
) -> list[Classroom]:
    resolved_school_id = resolve_school_assignment(current_user, school_id)
    query = select(Classroom).options(selectinload(Classroom.subjects))
    if resolved_school_id:
        query = query.where(Classroom.school_id == resolved_school_id)
    return db.execute(query.order_by(Classroom.name)).scalars().all()


def update_classroom(
    db: Session,
    classroom_id: int,
    payload: ClassroomUpdate,
    current_user: UserPublic,
) -> Classroom:
    classroom = db.get(Classroom, classroom_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada",
        )
    enforce_same_school(current_user, classroom.school_id)
    if payload.school_id != classroom.school_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é permitido alterar a unidade da turma",
        )
    subjects = _load_subjects(db, classroom.school_id, payload.subject_ids)
    _assert_unique_classroom(
        db,
        school_id=classroom.school_id,
        name=payload.name,
        code=payload.code,
        exclude_id=classroom_id,
    )
    classroom.name = payload.name
    classroom.code = payload.code
    classroom.grade_level = payload.grade_level
    classroom.subjects = subjects
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return classroom


def delete_classroom(
    db: Session,
    classroom_id: int,
    current_user: UserPublic,
) -> None:
    classroom = db.get(Classroom, classroom_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada",
        )
    enforce_same_school(current_user, classroom.school_id)
    has_members = db.scalar(
        select(func.count()).select_from(User).where(User.classroom_id == classroom_id)
    )
    active_assignments = db.scalar(
        select(func.count())
        .select_from(TeacherAssignment)
        .where(TeacherAssignment.classroom_id == classroom_id)
    )
    if has_members or active_assignments:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível remover: existem alunos ou atribuições vinculados",
        )
    db.delete(classroom)
    db.commit()
