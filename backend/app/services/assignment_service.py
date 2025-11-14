"""Teacher ↔ subject ↔ classroom assignment services."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from ..models import Classroom, TeacherAssignment
from ..schemas.assignment import AssignmentEntry, ClassroomAssignments
from ..schemas.user import UserPublic
from .access_control import enforce_same_school
from .organization_service import load_professor


def _load_classroom(db: Session, classroom_id: int) -> Classroom:
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


def _serialize(classroom: Classroom) -> ClassroomAssignments:
    map_assignments = {
        assignment.subject_id: assignment.teacher_id
        for assignment in classroom.assignments
    }
    return ClassroomAssignments(
        classroom_id=classroom.id,
        assignments=[
            AssignmentEntry(
                subject_id=subject.id,
                teacher_id=map_assignments.get(subject.id),
            )
            for subject in classroom.subjects
        ],
    )


def get_classroom_assignments(
    db: Session,
    classroom_id: int,
    current_user: UserPublic,
) -> ClassroomAssignments:
    classroom = _load_classroom(db, classroom_id)
    enforce_same_school(current_user, classroom.school_id)
    return _serialize(classroom)


def upsert_classroom_assignments(
    db: Session,
    classroom_id: int,
    payload: ClassroomAssignments,
    current_user: UserPublic,
) -> ClassroomAssignments:
    if payload.classroom_id != classroom_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O corpo da requisição não corresponde ao identificador da rota",
        )
    classroom = _load_classroom(db, classroom_id)
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
    classroom = _load_classroom(db, classroom_id)
    return _serialize(classroom)
