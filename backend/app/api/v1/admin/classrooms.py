"""Classroom management for admins and managers."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from ....core.database import get_session
from ....schemas.classroom import ClassroomCreate, ClassroomPublic, ClassroomUpdate
from ....schemas.user import UserPublic
from ....services import classroom_service
from .deps import require_admin_user

router = APIRouter(prefix="/classrooms")


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
    classroom = classroom_service.create_classroom(
        db=db,
        payload=payload,
        current_user=current_user,
    )
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
    classrooms = classroom_service.list_classrooms(
        db=db,
        current_user=current_user,
        school_id=school_id,
    )
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
    classroom = classroom_service.update_classroom(
        db=db,
        classroom_id=classroom_id,
        payload=payload,
        current_user=current_user,
    )
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
    classroom_service.delete_classroom(
        db=db,
        classroom_id=classroom_id,
        current_user=current_user,
    )
