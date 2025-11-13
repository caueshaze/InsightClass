"""Classroom management for admins and managers."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ....core.database import get_session
from ....models import Classroom, TeacherAssignment, User
from ....schemas.classroom import ClassroomCreate, ClassroomPublic, ClassroomUpdate
from ....schemas.user import UserPublic
from .deps import (
    enforce_same_school,
    ensure_non_empty,
    require_admin_user,
    require_classroom,
    require_school,
    require_subject,
    resolve_school_assignment,
)

router = APIRouter(prefix="/classrooms")


def _load_subjects(db: Session, school_id: int, subject_ids: list[int]):
    subjects = [
        require_subject(db, subject_id, school_id)
        for subject_id in ensure_non_empty(subject_ids, "Selecione ao menos uma matéria")
    ]
    return subjects


@router.post(
    "",
    response_model=ClassroomPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Cria uma nova turma",
)
def create_classroom(
    payload: ClassroomCreate,
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
) -> ClassroomPublic:
    target_school_id = resolve_school_assignment(current_user, payload.school_id)
    school = require_school(db, target_school_id)
    subjects = _load_subjects(db, school.id, payload.subject_ids)

    name_conflict = db.scalar(
        select(func.count())
        .select_from(Classroom)
        .where(
            Classroom.school_id == school.id,
            Classroom.name == payload.name,
        )
    )
    if name_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma turma com este nome na unidade",
        )
    if payload.code:
        code_conflict = db.scalar(
            select(func.count())
            .select_from(Classroom)
            .where(
                Classroom.school_id == school.id,
                Classroom.code == payload.code,
            )
        )
        if code_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Código de turma já utilizado na unidade",
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
    return ClassroomPublic.model_validate(classroom)


@router.get(
    "",
    response_model=list[ClassroomPublic],
    summary="Lista turmas cadastradas",
)
def list_classrooms(
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
    school_id: Optional[int] = Query(default=None, description="Filtra por unidade"),
) -> list[ClassroomPublic]:
    resolved_school_id = resolve_school_assignment(current_user, school_id)
    query = select(Classroom).options(selectinload(Classroom.subjects))
    if resolved_school_id:
        query = query.where(Classroom.school_id == resolved_school_id)
    classrooms = db.execute(query.order_by(Classroom.name)).scalars().all()
    return [ClassroomPublic.model_validate(classroom) for classroom in classrooms]


@router.put(
    "/{classroom_id}",
    response_model=ClassroomPublic,
    summary="Atualiza uma turma",
)
def update_classroom(
    classroom_id: int,
    payload: ClassroomUpdate,
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
) -> ClassroomPublic:
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

    name_conflict = db.scalar(
        select(func.count())
        .select_from(Classroom)
        .where(
            Classroom.school_id == classroom.school_id,
            Classroom.name == payload.name,
            Classroom.id != classroom_id,
        )
    )
    if name_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma turma com este nome nesta unidade",
        )
    if payload.code:
        code_conflict = db.scalar(
            select(func.count())
            .select_from(Classroom)
            .where(
                Classroom.school_id == classroom.school_id,
                Classroom.code == payload.code,
                Classroom.id != classroom_id,
            )
        )
        if code_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Código de turma já utilizado nesta unidade",
            )
    classroom.name = payload.name
    classroom.code = payload.code
    classroom.grade_level = payload.grade_level
    classroom.subjects = subjects
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return ClassroomPublic.model_validate(classroom)


@router.delete(
    "/{classroom_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove uma turma",
)
def delete_classroom(
    classroom_id: int,
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
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
