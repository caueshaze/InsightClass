"""Subject management endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ....core.database import get_session
from ....models import Subject, TeacherAssignment
from ....models.organization import classroom_subjects_table
from ....schemas.subject import SubjectCreate, SubjectPublic, SubjectUpdate
from ....schemas.user import UserPublic
from .deps import (
    enforce_same_school,
    require_admin_user,
    require_school,
    resolve_school_assignment,
)

router = APIRouter(prefix="/subjects")


@router.post(
    "",
    response_model=SubjectPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Cria uma nova matéria",
)
def create_subject(
    payload: SubjectCreate,
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
) -> SubjectPublic:
    target_school_id = resolve_school_assignment(current_user, payload.school_id)
    school = require_school(db, target_school_id)

    existing = (
        db.execute(
            select(Subject).where(
                Subject.school_id == school.id,
                Subject.name == payload.name,
            )
        )
        .scalar_one_or_none()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Matéria já cadastrada para esta unidade",
        )
    if payload.code:
        code_conflict = (
            db.execute(
                select(Subject).where(
                    Subject.school_id == school.id,
                    Subject.code == payload.code,
                )
            )
            .scalar_one_or_none()
        )
        if code_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Código já utilizado nesta unidade",
            )
    subject = Subject(
        name=payload.name,
        code=payload.code,
        color=payload.color,
        description=payload.description,
        school_id=school.id,
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return SubjectPublic.model_validate(subject)


@router.get(
    "",
    response_model=list[SubjectPublic],
    summary="Lista matérias cadastradas",
)
def list_subjects(
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
    school_id: int | None = Query(default=None),
) -> list[SubjectPublic]:
    resolved_school_id = resolve_school_assignment(current_user, school_id)
    query = select(Subject).options(selectinload(Subject.classrooms))
    if resolved_school_id is not None:
        query = query.where(Subject.school_id == resolved_school_id)
    subjects = db.execute(query.order_by(Subject.name)).scalars().all()
    return [SubjectPublic.model_validate(subject) for subject in subjects]


@router.put(
    "/{subject_id}",
    response_model=SubjectPublic,
    summary="Atualiza uma matéria",
)
def update_subject(
    subject_id: int,
    payload: SubjectUpdate,
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
) -> SubjectPublic:
    subject = db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Matéria não encontrada",
        )
    enforce_same_school(current_user, subject.school_id)

    name_conflict = (
        db.execute(
            select(Subject).where(
                Subject.id != subject_id,
                Subject.school_id == subject.school_id,
                Subject.name == payload.name,
            )
        )
        .scalar_one_or_none()
    )
    if name_conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma matéria com este nome na unidade",
        )
    if payload.code:
        code_conflict = (
            db.execute(
                select(Subject).where(
                    Subject.id != subject_id,
                    Subject.school_id == subject.school_id,
                    Subject.code == payload.code,
                )
            )
            .scalar_one_or_none()
        )
        if code_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Código já utilizado nesta unidade",
            )
    subject.name = payload.name
    subject.code = payload.code
    subject.color = payload.color
    subject.description = payload.description
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return SubjectPublic.model_validate(subject)


@router.delete(
    "/{subject_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove uma matéria",
)
def delete_subject(
    subject_id: int,
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
) -> None:
    subject = db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Matéria não encontrada",
        )
    enforce_same_school(current_user, subject.school_id)

    linked_classrooms = db.scalar(
        select(func.count())
        .select_from(classroom_subjects_table)
        .where(classroom_subjects_table.c.subject_id == subject_id)
    )
    assignments = db.scalar(
        select(func.count())
        .select_from(TeacherAssignment)
        .where(TeacherAssignment.subject_id == subject_id)
    )
    if linked_classrooms or assignments:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível remover: há turmas ou atribuições vinculadas",
        )
    db.delete(subject)
    db.commit()
