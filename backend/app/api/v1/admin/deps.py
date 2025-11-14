"""Shared helpers for admin routes."""

from __future__ import annotations

from typing import Optional

from fastapi import Depends

from ....core.security import require_role
from ....schemas.user import UserPublic
from ....services.access_control import (
    enforce_same_school as _enforce_same_school,
    manager_school_or_error as _manager_school_or_error,
    resolve_school_assignment as _resolve_school_assignment,
)
from ....services.organization_service import (
    ensure_non_empty as _ensure_non_empty,
    load_professor as _load_professor,
    require_classroom as _require_classroom,
    require_school as _require_school,
    require_subject as _require_subject,
    validate_professor as _validate_professor,
)

ROLE_ALIASES = {
    "admin": "admin",
    "gestor": "gestor",
    "manager": "gestor",
    "professor": "professor",
    "teacher": "professor",
    "aluno": "aluno",
    "student": "aluno",
}


def require_admin_user(*roles: str):
    """Returns a dependency that enforces the desired admin role."""
    return require_role(*roles)


def normalize_role_param(role: Optional[str]) -> Optional[str]:
    if role is None:
        return None
    return ROLE_ALIASES.get(role.lower())


manager_school_or_error = _manager_school_or_error
resolve_school_assignment = _resolve_school_assignment
enforce_same_school = _enforce_same_school
require_school = _require_school
require_classroom = _require_classroom
require_subject = _require_subject
ensure_non_empty = _ensure_non_empty
validate_professor = _validate_professor
load_professor = _load_professor
