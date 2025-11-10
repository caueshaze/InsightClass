"""Feedback-related endpoints."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, delete, or_, select
from sqlalchemy.orm import Session, joinedload

from ...core.crypto import decrypt_feedback, encrypt_feedback
from ...core.database import get_session
from ...core.security import get_current_user, require_role
from ...core.sentiment import analyze_sentiment
from ...core.triggers import detect_triggers
from ...core.llm import (
    generate_admin_summary,
    generate_personal_summary,
)
from ...models import Feedback, User
from ...schemas.feedback import (
    FeedbackCreate,
    FeedbackMineResponse,
    FeedbackPublic,
)
from ...schemas.summary import FeedbackSummary
from ...schemas.user import UserPublic

router = APIRouter(prefix="/feedback", tags=["feedback"])


def _serialize_feedback(
    feedback: Feedback,
    *,
    sender_name: str | None = None,
    target_name: str | None = None,
) -> FeedbackPublic:
    """Convert a Feedback ORM object to its public representation."""
    decrypted = decrypt_feedback(feedback.content_encrypted, feedback.nonce)
    resolved_sender = (
        sender_name
        or getattr(getattr(feedback, "sender", None), "full_name", None)
        or getattr(getattr(feedback, "sender", None), "email", None)
    )
    resolved_target = (
        target_name
        or getattr(getattr(feedback, "target", None), "full_name", None)
        or getattr(getattr(feedback, "target", None), "email", None)
    )
    return FeedbackPublic(
        id=feedback.id,
        sender_id=feedback.sender_id,
        sender_name=resolved_sender,
        target_type=feedback.target_type,
        target_id=feedback.target_id,
        target_name=resolved_target,
        content=decrypted,
        sentiment=feedback.sentiment,
        category=feedback.category,
        sentiment_label=feedback.sentiment_label,
        sentiment_score=feedback.sentiment_score,
        has_trigger=feedback.has_trigger,
        created_at=feedback.created_at,
    )


@router.post(
    "",
    response_model=FeedbackPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Cria um feedback criptografado",
)
def create_feedback(
    payload: FeedbackCreate,
    current_user: UserPublic = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> FeedbackPublic:
    """Persist a feedback entry applying trigger detection, encryption and sentiment."""
    if payload.target_type != "user":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de destino inválido para este endpoint",
        )

    triggers = detect_triggers(payload.content)
    cipher_text, nonce = encrypt_feedback(payload.content)
    target_user_id = str(payload.target_id)
    target_user = db.get(User, target_user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuário destino não encontrado"
        )
    if target_user.role == "admin" and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não é permitido enviar feedbacks para administradores",
        )

    sentiment_label, sentiment_score = analyze_sentiment(payload.content)
    feedback = Feedback(
        sender_id=current_user.id,
        target_type=payload.target_type,
        target_id=str(payload.target_id),
        content_encrypted=cipher_text,
        nonce=nonce,
        has_trigger=bool(triggers),
        sentiment=sentiment_label,
        sentiment_label=sentiment_label,
        sentiment_score=sentiment_score,
    )
    db.add(feedback)
    db.flush()
    db.commit()
    db.refresh(feedback)
    return _serialize_feedback(
        feedback,
        sender_name=current_user.full_name,
        target_name=target_user.full_name,
    )


@router.get(
    "/mine",
    response_model=FeedbackMineResponse,
    summary="Lista feedbacks visíveis ao usuário autenticado",
)
def list_my_feedbacks(
    current_user: UserPublic = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> FeedbackMineResponse:
    """Return separated lists of sent and received feedbacks for the authenticated user."""
    sent_query = (
        select(Feedback)
        .options(joinedload(Feedback.sender), joinedload(Feedback.target))
        .where(Feedback.sender_id == current_user.id)
        .order_by(Feedback.created_at.desc())
    )
    received_query = (
        select(Feedback)
        .options(joinedload(Feedback.sender), joinedload(Feedback.target))
        .where(Feedback.target_type == "user", Feedback.target_id == str(current_user.id))
        .order_by(Feedback.created_at.desc())
    )

    sent_items = db.execute(sent_query).scalars().all()
    received_items = db.execute(received_query).scalars().all()
    return FeedbackMineResponse(
        sent=[_serialize_feedback(item) for item in sent_items],
        received=[_serialize_feedback(item) for item in received_items],
    )


@router.get(
    "/admin/all",
    response_model=List[FeedbackPublic],
    summary="Lista todos os feedbacks (apenas admin/gestor)",
)
def list_all_feedbacks(
    _: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
) -> List[FeedbackPublic]:
    query = (
        select(Feedback)
        .options(joinedload(Feedback.sender), joinedload(Feedback.target))
        .order_by(Feedback.created_at.desc())
    )
    feedbacks = db.execute(query).scalars().all()
    return [_serialize_feedback(item) for item in feedbacks]


@router.delete(
    "/admin/all",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove todos os feedbacks (apenas admin)",
)
def delete_all_feedbacks(
    _: UserPublic = Depends(require_role("admin")),
    db: Session = Depends(get_session),
) -> None:
    db.execute(delete(Feedback))
    db.commit()


@router.delete(
    "/admin/{feedback_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove um feedback específico (admin/gestor)",
)
def delete_feedback(
    feedback_id: int,
    current_user: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
) -> None:
    feedback = db.get(Feedback, feedback_id)
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback não encontrado",
        )
    if current_user.role == "gestor":
        manager_school_id = current_user.school_id
        if not manager_school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Perfil de gestor sem unidade vinculada",
            )
        sender = db.get(User, feedback.sender_id)
        target_user = None
        if feedback.target_type == "user":
            target_user = db.get(User, feedback.target_id)
        allowed = bool(
            (sender and sender.school_id == manager_school_id)
            or (target_user and target_user.school_id == manager_school_id)
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Gestores só podem remover feedbacks da própria unidade",
            )
    db.delete(feedback)
    db.commit()


@router.get(
    "/summary/me",
    response_model=FeedbackSummary,
    summary="Resumo com IA para o usuário autenticado",
)
def summarize_my_feedbacks(
    current_user: UserPublic = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> FeedbackSummary:
    return generate_personal_summary(db=db, current_user=current_user)


@router.get(
    "/summary/admin",
    response_model=FeedbackSummary,
    summary="Resumo estratégico com IA para administradores/gestores",
)
def summarize_all_feedbacks(
    _: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
    school_id: str | None = Query(default=None, description="Filtra por escola quando aplicável"),
) -> FeedbackSummary:
    return generate_admin_summary(db=db, school_id=school_id)
