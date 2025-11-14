"""Endpoints to manage professor ↔ matéria ↔ turma assignments."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ....core.database import get_session
from ....schemas.assignment import ClassroomAssignments
from ....schemas.user import UserPublic
from ....services import assignment_service
from .deps import require_admin_user

router = APIRouter(prefix="/assignments")


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
    return assignment_service.get_classroom_assignments(
        db=db,
        classroom_id=classroom_id,
        current_user=current_user,
    )


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
    return assignment_service.upsert_classroom_assignments(
        db=db,
        classroom_id=classroom_id,
        payload=payload,
        current_user=current_user,
    )
