"""Feedback-related endpoints."""

from datetime import datetime
from itertools import chain
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, delete, or_, select
from sqlalchemy.orm import Session, aliased, joinedload

from ...core.crypto import encrypt_feedback
from ...core.database import get_session
from ...core.security import get_current_user, require_role
from ...core.sentiment import analyze_sentiment
from ...core.triggers import detect_triggers, load_trigger_keywords
from ...core.llm import (
    generate_admin_summary,
    generate_personal_summary,
)
from ...models import Feedback, User
from ...models.organization import Subject, Classroom
from ...schemas.feedback import (
    FeedbackCreate,
    FeedbackMineResponse,
    FeedbackPublic,
    FeedbackReport,
    FeedbackResolve,
)
from ...schemas.subject import SubjectPublic
from ...schemas.classroom import ClassroomPublic
from ...schemas.summary import FeedbackSummary
from ...schemas.user import UserPublic
from .feedback_utils import (
    _assert_class_permission,
    _assert_subject_permission,
    _build_target_context,
    _get_feedback_target_school_id,
    _load_current_user_profile,
    _resolve_class_target,
    _resolve_subject_target,
    _safe_int,
    _school_scope_clause,
    _serialize_feedback,
    _visible_classroom_ids,
    _visible_subject_ids,
)

router = APIRouter(prefix="/feedback", tags=["feedback"])


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
    db_user = _load_current_user_profile(db, current_user.id)
    keywords = load_trigger_keywords(db, current_user.school_id)
    triggers = detect_triggers(payload.content, keywords)
    cipher_text, nonce = encrypt_feedback(payload.content)

    target_user: User | None = None
    target_name: str | None = None
    target_role_label: str | None = None
    target_email: str | None = None
    target_school_id: int | None = None
    resolved_target_id: str

    if payload.target_type == "user":
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
        target_name = target_user.full_name
        target_role_label = target_user.role
        target_email = target_user.email
        target_school_id = target_user.school_id
        resolved_target_id = target_user.id
    elif payload.target_type == "subject":
        subject = _resolve_subject_target(db, payload.target_id)
        _assert_subject_permission(current_user, db_user, subject)
        target_name = subject.name
        target_role_label = "subject"
        target_school_id = subject.school_id
        resolved_target_id = str(subject.id)
    elif payload.target_type == "class":
        classroom = _resolve_class_target(db, payload.target_id)
        _assert_class_permission(current_user, db_user, classroom)
        target_name = classroom.name
        target_role_label = "class"
        target_school_id = classroom.school_id
        resolved_target_id = str(classroom.id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de destino inválido",
        )

    sentiment_label, sentiment_score = analyze_sentiment(payload.content)
    feedback = Feedback(
        sender_id=current_user.id,
        target_type=payload.target_type,
        target_id=resolved_target_id,
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
        target_name=target_name or getattr(target_user, "full_name", None),
        sender_role=current_user.role,
        target_role=target_role_label or getattr(target_user, "role", None),
        sender_email=current_user.email,
        target_email=target_email or getattr(target_user, "email", None),
        target_school_id=target_school_id or getattr(target_user, "school_id", None),
        viewer=current_user,
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
    db_user = _load_current_user_profile(db, current_user.id)
    sent_query = (
        select(Feedback)
        .options(joinedload(Feedback.sender), joinedload(Feedback.target))
        .where(Feedback.sender_id == current_user.id)
        .order_by(Feedback.created_at.desc())
    )

    subject_ids = _visible_subject_ids(current_user, db_user, db)
    classroom_ids = _visible_classroom_ids(current_user, db_user, db)
    received_conditions = [
        and_(
            Feedback.target_type == "user",
            Feedback.target_id == str(current_user.id),
        )
    ]
    if subject_ids:
        received_conditions.append(
            and_(
                Feedback.target_type == "subject",
                Feedback.target_id.in_([str(subject_id) for subject_id in subject_ids]),
            )
        )
    if classroom_ids:
        received_conditions.append(
            and_(
                Feedback.target_type == "class",
                Feedback.target_id.in_([str(classroom_id) for classroom_id in classroom_ids]),
            )
        )
    received_query = (
        select(Feedback)
        .options(joinedload(Feedback.sender), joinedload(Feedback.target))
        .where(or_(*received_conditions))
        .order_by(Feedback.created_at.desc())
    )

    sent_items = db.execute(sent_query).scalars().all()
    received_items = db.execute(received_query).scalars().all()
    target_context = _build_target_context(db, list(chain(sent_items, received_items)))

    def _serialize(item: Feedback) -> FeedbackPublic:
        ctx = target_context.get(item.id, {})
        return _serialize_feedback(
            item,
            target_name=ctx.get("target_name"),
            target_role=ctx.get("target_role"),
            target_email=ctx.get("target_email"),
            target_school_id=ctx.get("target_school_id"),
            viewer=current_user,
        )

    return FeedbackMineResponse(
        sent=[_serialize(item) for item in sent_items],
        received=[_serialize(item) for item in received_items],
    )


@router.get(
    "/available/subjects",
    response_model=List[SubjectPublic],
    summary="Lista matérias que o usuário pode selecionar como destino",
)
def list_available_subjects(
    current_user: UserPublic = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> List[SubjectPublic]:
    db_user = _load_current_user_profile(db, current_user.id)
    subject_ids = _visible_subject_ids(current_user, db_user, db)
    if current_user.role == "admin":
        query = select(Subject).order_by(Subject.name)
    elif current_user.role == "gestor":
        if not current_user.school_id:
            return []
        query = select(Subject).where(Subject.school_id == current_user.school_id).order_by(Subject.name)
    elif not subject_ids:
        return []
    else:
        query = (
            select(Subject)
            .where(Subject.id.in_(sorted(subject_ids)))
            .order_by(Subject.name)
        )
    subjects = db.execute(query).scalars().all()
    return [SubjectPublic.model_validate(subject) for subject in subjects]


@router.get(
    "/available/classrooms",
    response_model=List[ClassroomPublic],
    summary="Lista turmas elegíveis para envio de feedback",
)
def list_available_classrooms(
    current_user: UserPublic = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> List[ClassroomPublic]:
    db_user = _load_current_user_profile(db, current_user.id)
    classroom_ids = _visible_classroom_ids(current_user, db_user, db)
    if current_user.role == "admin":
        query = select(Classroom).order_by(Classroom.name)
    elif current_user.role == "gestor":
        if not current_user.school_id:
            return []
        query = (
            select(Classroom)
            .where(Classroom.school_id == current_user.school_id)
            .order_by(Classroom.name)
        )
    elif not classroom_ids:
        return []
    else:
        query = (
            select(Classroom)
            .where(Classroom.id.in_(sorted(classroom_ids)))
            .order_by(Classroom.name)
        )
    classrooms = db.execute(query).scalars().all()
    return [ClassroomPublic.model_validate(classroom) for classroom in classrooms]


@router.get(
    "/admin/all",
    response_model=List[FeedbackPublic],
    summary="Lista todos os feedbacks (apenas admin/gestor)",
)
def list_all_feedbacks(
    current_user: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
    school_id: Optional[int] = Query(
        default=None, description="Filtra por unidade escolar (apenas admin)."
    ),
) -> List[FeedbackPublic]:
    sender_alias = aliased(User)
    target_alias = aliased(User)

    query = (
        select(Feedback)
        .options(joinedload(Feedback.sender), joinedload(Feedback.target))
        .join(sender_alias, Feedback.sender_id == sender_alias.id)
        .outerjoin(
            target_alias,
            and_(Feedback.target_type == "user", Feedback.target_id == target_alias.id),
        )
        .order_by(Feedback.created_at.desc())
    )

    if current_user.role == "gestor":
        manager_school_id = current_user.school_id
        if not manager_school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Perfil de gestor sem unidade vinculada",
            )
        query = query.where(_school_scope_clause(manager_school_id, sender_alias, target_alias))
    elif school_id is not None:
        query = query.where(_school_scope_clause(school_id, sender_alias, target_alias))
    feedbacks = db.execute(query).scalars().all()
    target_context = _build_target_context(db, feedbacks)
    serialized: list[FeedbackPublic] = []
    for item in feedbacks:
        ctx = target_context.get(item.id, {})
        serialized.append(
            _serialize_feedback(
                item,
                target_name=ctx.get("target_name"),
                target_role=ctx.get("target_role"),
                target_email=ctx.get("target_email"),
                target_school_id=ctx.get("target_school_id"),
                viewer=current_user,
            )
        )
    return serialized


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


@router.get(
    "/triggers",
    response_model=List[FeedbackPublic],
    summary="Lista feedbacks com gatilho (admin/gestor/professor)",
)
def list_triggered_feedbacks(
    current_user: UserPublic = Depends(require_role("admin", "gestor", "professor")),
    db: Session = Depends(get_session),
    school_id: Optional[int] = Query(
        default=None, description="Filtra por unidade (apenas admin)."
    ),
    include_resolved: bool = Query(
        default=False,
        description="Inclui alertas já resolvidos (apenas admin/gestor).",
    ),
) -> List[FeedbackPublic]:
    sender_alias = aliased(User)
    target_alias = aliased(User)

    query = (
        select(Feedback)
        .options(joinedload(Feedback.sender), joinedload(Feedback.target))
        .join(sender_alias, Feedback.sender_id == sender_alias.id)
        .outerjoin(
            target_alias,
            and_(Feedback.target_type == "user", Feedback.target_id == target_alias.id),
        )
        .where(Feedback.has_trigger.is_(True))
        .order_by(Feedback.created_at.desc())
    )

    if current_user.role == "professor":
        include_resolved = False

    if not include_resolved:
        query = query.where(Feedback.trigger_resolved_at.is_(None))

    if current_user.role == "professor":
        db_user = _load_current_user_profile(db, current_user.id)
        subject_ids = _visible_subject_ids(current_user, db_user, db)
        classroom_ids = _visible_classroom_ids(current_user, db_user, db)
        filters = [
            Feedback.sender_id == current_user.id,
            and_(Feedback.target_type == "user", Feedback.target_id == str(current_user.id)),
        ]
        if subject_ids:
            filters.append(
                and_(
                    Feedback.target_type == "subject",
                    Feedback.target_id.in_([str(subject_id) for subject_id in subject_ids]),
                )
            )
        if classroom_ids:
            filters.append(
                and_(
                    Feedback.target_type == "class",
                    Feedback.target_id.in_([str(classroom_id) for classroom_id in classroom_ids]),
                )
            )
        query = query.where(or_(*filters))
    elif current_user.role == "gestor":
        manager_school_id = current_user.school_id
        if not manager_school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Perfil de gestor sem unidade vinculada",
            )
        query = query.where(_school_scope_clause(manager_school_id, sender_alias, target_alias))
    else:  # admin
        if school_id is not None:
            query = query.where(_school_scope_clause(school_id, sender_alias, target_alias))

    feedbacks = db.execute(query).scalars().all()
    target_context = _build_target_context(db, feedbacks)
    serialized: list[FeedbackPublic] = []
    for item in feedbacks:
        ctx = target_context.get(item.id, {})
        serialized.append(
            _serialize_feedback(
                item,
                target_name=ctx.get("target_name"),
                target_role=ctx.get("target_role"),
                target_email=ctx.get("target_email"),
                target_school_id=ctx.get("target_school_id"),
                viewer=current_user,
            )
        )
    return serialized


@router.post(
    "/{feedback_id}/report",
    response_model=FeedbackPublic,
    summary="Reporta manualmente um feedback como alerta",
)
def report_feedback_alert(
    feedback_id: int,
    payload: FeedbackReport,
    current_user: UserPublic = Depends(require_role("admin", "gestor", "professor")),
    db: Session = Depends(get_session),
) -> FeedbackPublic:
    feedback = (
        db.execute(
            select(Feedback)
            .options(joinedload(Feedback.sender), joinedload(Feedback.target))
            .where(Feedback.id == feedback_id)
        )
        .scalar_one_or_none()
    )
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback não encontrado",
        )

    reason = payload.reason.strip()
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe um motivo válido para o alerta.",
        )

    if current_user.role == "professor":
        db_user = _load_current_user_profile(db, current_user.id)
        subject_ids = _visible_subject_ids(current_user, db_user, db)
        classroom_ids = _visible_classroom_ids(current_user, db_user, db)
        allowed = feedback.sender_id == current_user.id
        if feedback.target_type == "user" and feedback.target_id == str(current_user.id):
            allowed = True
        if feedback.target_type == "subject" and _safe_int(feedback.target_id) in subject_ids:
            allowed = True
        if feedback.target_type == "class" and _safe_int(feedback.target_id) in classroom_ids:
            allowed = True
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você só pode reportar feedbacks do seu escopo.",
            )
    elif current_user.role == "gestor":
        manager_school_id = current_user.school_id
        if not manager_school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Perfil de gestor sem unidade vinculada",
            )
        sender_school = getattr(feedback.sender, "school_id", None)
        target_school = _get_feedback_target_school_id(db, feedback)
        if sender_school != manager_school_id and target_school != manager_school_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Gestores só podem intervir em feedbacks da própria unidade.",
            )

    feedback.has_trigger = True
    feedback.manual_trigger_reason = reason[:280]
    feedback.manual_triggered_by = current_user.id
    feedback.trigger_resolved_at = None
    feedback.trigger_resolved_by = None
    feedback.trigger_resolved_note = None
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return _serialize_feedback(feedback, viewer=current_user)


@router.post(
    "/triggers/{feedback_id}/resolve",
    response_model=FeedbackPublic,
    summary="Marca um alerta de gatilho como resolvido",
)
def resolve_trigger_alert(
    feedback_id: int,
    payload: FeedbackResolve,
    current_user: UserPublic = Depends(require_role("admin", "gestor")),
    db: Session = Depends(get_session),
) -> FeedbackPublic:
    feedback = (
        db.execute(
            select(Feedback)
            .options(joinedload(Feedback.sender), joinedload(Feedback.target))
            .where(Feedback.id == feedback_id)
        )
        .scalar_one_or_none()
    )
    if not feedback or not feedback.has_trigger:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback com alerta não encontrado",
        )
    if feedback.trigger_resolved_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este alerta já foi marcado como resolvido.",
        )
    if current_user.role == "gestor":
        manager_school_id = current_user.school_id
        if not manager_school_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Perfil de gestor sem unidade vinculada",
            )
        sender_school = getattr(feedback.sender, "school_id", None)
        target_school = _get_feedback_target_school_id(db, feedback)
        if sender_school != manager_school_id and target_school != manager_school_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Gestores só podem resolver alertas da própria unidade.",
            )
    feedback.trigger_resolved_at = datetime.utcnow()
    feedback.trigger_resolved_by = current_user.id
    feedback.trigger_resolved_note = (
        payload.note.strip() if payload.note and payload.note.strip() else None
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return _serialize_feedback(feedback, viewer=current_user)
...


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
        target_school = _get_feedback_target_school_id(db, feedback)
        allowed = bool(
            (sender and sender.school_id == manager_school_id)
            or (target_school == manager_school_id)
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Gestores só podem remover feedbacks da própria unidade",
            )
    db.delete(feedback)
    db.commit()


@router.delete(
    "/{feedback_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove um feedback enviado por você",
)
def delete_my_feedback(
    feedback_id: int,
    current_user: UserPublic = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> None:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Remover feedbacks não está mais disponível. Use o painel para ocultar registros localmente.",
    )


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
