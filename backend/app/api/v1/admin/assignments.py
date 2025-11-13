"""Endpoints to manage professor ↔ matéria ↔ turma assignments."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from ....core.database import get_session
from ....models import Classroom, TeacherAssignment, User
from ....schemas.assignment import AssignmentEntry, ClassroomAssignments
from ....schemas.user import UserPublic
from .deps import (
    enforce_same_school,
    load_professor,
    require_admin_user,
    require_classroom,
    resolve_school_assignment,
)

router = APIRouter(prefix="/assignments")


def _load_classroom_with_subjects(db: Session, classroom_id: int) -> Classroom:
    classroom = (
        db.execute(
            select(Classroom)
            .options(
                selectinload(Classroom.subjects),
                selectinload(Classroom.assignments).selectinload(TeacherAssignment.teacher),
            )
            .where(Classroom.id == classroom_id)
        )
        .scalar_one_or_none()
    )
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada",
        )
    return classroom


def _validate_assignment(
    db: Session,
    classroom: Classroom,
    entry: AssignmentEntry,
) -> None:
    if entry.subject_id not in classroom.subject_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Matéria não pertence à turma selecionada",
        )
    if entry.teacher_id is None:
        return
    teacher = load_professor(db, entry.teacher_id, classroom.school_id)
    if entry.subject_id not in teacher.teachable_subject_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Professor não habilitado para esta matéria",
        )


def _serialize_assignments(classroom: Classroom) -> ClassroomAssignments:
    map_assignments = {assignment.subject_id: assignment.teacher_id for assignment in classroom.assignments}
    return ClassroomAssignments(
        classroom_id=classroom.id,
        assignments=[
            AssignmentEntry(subject_id=subject.id, teacher_id=map_assignments.get(subject.id))
            for subject in classroom.subjects
        ],
    )


@router.get(
    "/{classroom_id}",
    response_model=ClassroomAssignments,
    summary="Lista atribuições professor ↔ matéria da turma",
)
def get_classroom_assignments(
    classroom_id: int,
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
) -> ClassroomAssignments:
    classroom = _load_classroom_with_subjects(db, classroom_id)
    enforce_same_school(current_user, classroom.school_id)
    return _serialize_assignments(classroom)


@router.put(
    "/{classroom_id}",
    response_model=ClassroomAssignments,
    summary="Atualiza atribuições de professores para a turma",
)
def upsert_classroom_assignments(
    classroom_id: int,
    payload: ClassroomAssignments,
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
) -> ClassroomAssignments:
    if payload.classroom_id != classroom_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O corpo da requisição não corresponde ao identificador da rota",
        )
    classroom = _load_classroom_with_subjects(db, classroom_id)
    enforce_same_school(current_user, classroom.school_id)

    for entry in payload.assignments:
        _validate_assignment(db, classroom, entry)

    db.execute(delete(TeacherAssignment).where(TeacherAssignment.classroom_id == classroom_id))
    for entry in payload.assignments:
        if entry.teacher_id is None:
            continue
        assignment = TeacherAssignment(
            classroom_id=classroom_id,
            subject_id=entry.subject_id,
            teacher_id=entry.teacher_id,
        )
        db.add(assignment)
    db.commit()
    db.refresh(classroom)
    classroom = _load_classroom_with_subjects(db, classroom_id)
    return _serialize_assignments(classroom)
