"""Role-based helpers shared across routers and services."""

from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, status

from ..schemas.user import UserPublic


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
    """
    Gestores só podem operar dentro da própria unidade.
    Admins podem escolher qualquer unidade.
    """
    if current_user.role != "gestor":
        return requested_school_id
    manager_school_id = manager_school_or_error(current_user)
    if requested_school_id and requested_school_id != manager_school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gestores só podem operar dentro da própria unidade",
        )
    return manager_school_id


def enforce_same_school(user: UserPublic, school_id: int) -> None:
    """Ensure managers do not reach resources belonging to another school."""
    if user.role == "admin":
        return
    manager_school_id = manager_school_or_error(user)
    if school_id != manager_school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gestores só podem operar na própria unidade",
        )
