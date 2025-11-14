"""User management endpoints for admin and gestor roles."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ....core.database import get_session
from ....models import User
from ....schemas.user import UserCreate, UserPublic, UserUpdate
from ....services import user_service
from .deps import normalize_role_param, require_admin_user

router = APIRouter(prefix="/users")


@router.post(
    "",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    payload: UserCreate,
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
) -> UserPublic:
    created = user_service.create_user(db=db, payload=payload, current_user=current_user)
    return UserPublic.model_validate(created)


@router.put(
    "/{user_id}",
    response_model=UserPublic,
)
def update_user(
    user_id: str,
    payload: UserUpdate,
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
) -> UserPublic:
    updated = user_service.update_user(
        db=db,
        user_id=user_id,
        payload=payload,
        current_user=current_user,
    )
    return UserPublic.model_validate(updated)


@router.get(
    "",
    response_model=list[UserPublic],
    summary="Lista usuários com paginação básica",
)
def list_users(
    current_user: UserPublic = Depends(
        require_admin_user("admin", "gestor", "professor", "aluno")
    ),
    db: Session = Depends(get_session),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    role: str | None = Query(default=None),
) -> list[UserPublic]:
    normalized_role = normalize_role_param(role)
    if normalized_role is None and role is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role inválido",
        )
    result = user_service.list_users(
        db=db,
        current_user=current_user,
        normalized_role=normalized_role,
        offset=offset,
        limit=limit,
    )
    return [UserPublic.model_validate(user) for user in result]


@router.get(
    "/{user_id}",
    response_model=UserPublic,
    summary="Recupera um usuário específico",
)
def get_user(
    user_id: str,
    _: UserPublic = Depends(require_admin_user("admin")),
    db: Session = Depends(get_session),
) -> UserPublic:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )
    return UserPublic.model_validate(user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove um usuário",
)
def delete_user(
    user_id: str,
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
) -> None:
    user_service.delete_user(db=db, user_id=user_id, current_user=current_user)
