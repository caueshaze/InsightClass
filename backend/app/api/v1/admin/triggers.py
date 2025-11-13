"""Trigger keyword management for admins and managers."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ....core.database import get_session
from ....models import TriggerKeyword
from ....schemas.trigger import TriggerKeywordCreate, TriggerKeywordPublic
from ....schemas.user import UserPublic
from .deps import manager_school_or_error, require_admin_user

router = APIRouter(prefix="/trigger_keywords")


def _resolve_keyword_scope(current_user: UserPublic, requested_school: Optional[int]) -> Optional[int]:
    if current_user.role == "admin":
        return requested_school
    manager_school_id = manager_school_or_error(current_user)
    if requested_school and requested_school != manager_school_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gestores só podem operar na própria unidade",
        )
    return manager_school_id


@router.get(
    "",
    response_model=list[TriggerKeywordPublic],
    summary="Lista palavras-chave de alerta",
)
def list_trigger_keywords(
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
    school_id: Optional[int] = Query(default=None),
) -> list[TriggerKeywordPublic]:
    resolved_school_id = _resolve_keyword_scope(current_user, school_id)
    query = select(TriggerKeyword)
    if resolved_school_id is not None:
        query = query.where(TriggerKeyword.school_id == resolved_school_id)
    keywords = db.execute(query.order_by(TriggerKeyword.keyword)).scalars().all()
    return [TriggerKeywordPublic.model_validate(item) for item in keywords]


@router.post(
    "",
    response_model=TriggerKeywordPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Cria uma nova palavra-chave",
)
def create_trigger_keyword(
    payload: TriggerKeywordCreate,
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
) -> TriggerKeywordPublic:
    resolved_school_id = _resolve_keyword_scope(current_user, payload.school_id)
    keyword_normalized = payload.keyword.strip().lower()
    if not keyword_normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe uma palavra válida",
        )
    existing = (
        db.execute(
            select(TriggerKeyword).where(
                TriggerKeyword.keyword == keyword_normalized,
                TriggerKeyword.school_id.is_(resolved_school_id),
            )
        )
        .scalar_one_or_none()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta palavra já está configurada para o escopo informado",
        )
    keyword = TriggerKeyword(keyword=keyword_normalized, school_id=resolved_school_id)
    db.add(keyword)
    db.commit()
    db.refresh(keyword)
    return TriggerKeywordPublic.model_validate(keyword)


@router.delete(
    "/{keyword_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove uma palavra-chave de alerta",
)
def delete_trigger_keyword(
    keyword_id: int,
    current_user: UserPublic = Depends(require_admin_user("admin", "gestor")),
    db: Session = Depends(get_session),
) -> None:
    keyword = db.get(TriggerKeyword, keyword_id)
    if not keyword:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Palavra não encontrada",
        )
    if current_user.role == "gestor":
        manager_school_id = manager_school_or_error(current_user)
        if keyword.school_id != manager_school_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Gestores só podem remover palavras da própria unidade",
            )
    db.delete(keyword)
    db.commit()
