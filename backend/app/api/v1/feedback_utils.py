"""Utility helpers shared across feedback routes."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import Integer, and_, cast, exists, or_, select
from sqlalchemy.orm import Session, selectinload

from ...core.crypto import decrypt_feedback
from ...models import Feedback, TeacherAssignment, User
from ...models.organization import Classroom, Subject
from ...schemas.feedback import FeedbackPublic
from ...schemas.user import UserPublic

__all__ = [
    "_serialize_feedback",
    "_resolve_subject_target",
    "_resolve_class_target",
    "_assert_subject_permission",
    "_assert_class_permission",
    "_safe_int",
    "_load_current_user_profile",
    "_visible_subject_ids",
    "_visible_classroom_ids",
    "_build_target_context",
    "_get_feedback_target_school_id",
    "_school_scope_clause",
]


def _serialize_feedback(
    feedback: Feedback,
    *,
    sender_name: str | None = None,
    target_name: str | None = None,
    sender_role: str | None = None,
    target_role: str | None = None,
    sender_email: str | None = None,
    target_email: str | None = None,
    target_school_id: int | None = None,
    viewer: UserPublic | None = None,
    mask_sentiment: bool = False,
) -> FeedbackPublic:
    """Convert a Feedback ORM object to its public representation."""

    hide_sentiment = mask_sentiment or (
        viewer is not None
        and viewer.role not in {"admin", "gestor"}
        and str(viewer.id) == str(feedback.sender_id)
    )

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
    resolved_sender_role = sender_role or getattr(getattr(feedback, "sender", None), "role", None)
    resolved_target_role = target_role or getattr(getattr(feedback, "target", None), "role", None)
    resolved_sender_email = sender_email or getattr(getattr(feedback, "sender", None), "email", None)
    resolved_target_email = target_email or getattr(getattr(feedback, "target", None), "email", None)
    resolved_sender_school = getattr(getattr(feedback, "sender", None), "school_id", None)
    resolved_target_school = target_school_id or getattr(
        getattr(feedback, "target", None), "school_id", None
    )

    sentiment_value = None if hide_sentiment else feedback.sentiment
    category_value = None if hide_sentiment else feedback.category
    sentiment_label_value = None if hide_sentiment else feedback.sentiment_label
    sentiment_score_value = None if hide_sentiment else feedback.sentiment_score

    return FeedbackPublic(
        id=feedback.id,
        sender_id=feedback.sender_id,
        sender_name=resolved_sender,
        sender_role=resolved_sender_role,
        sender_email=resolved_sender_email,
        sender_school_id=resolved_sender_school,
        target_type=feedback.target_type,
        target_id=feedback.target_id,
        target_name=resolved_target,
        target_role=resolved_target_role,
        target_email=resolved_target_email,
        target_school_id=resolved_target_school,
        content=decrypted,
        sentiment=sentiment_value,
        category=category_value,
        sentiment_label=sentiment_label_value,
        sentiment_score=sentiment_score_value,
        has_trigger=feedback.has_trigger,
        manual_trigger_reason=feedback.manual_trigger_reason,
        manual_triggered_by=feedback.manual_triggered_by,
        trigger_resolved_at=feedback.trigger_resolved_at,
        trigger_resolved_by=feedback.trigger_resolved_by,
        trigger_resolved_note=feedback.trigger_resolved_note,
        created_at=feedback.created_at,
    )


def _resolve_subject_target(db: Session, target_id: str | int) -> Subject:
    try:
        subject_id = int(target_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identificador de matéria inválido",
        )
    subject = db.get(Subject, subject_id)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Matéria não encontrada",
        )
    return subject


def _resolve_class_target(db: Session, target_id: str | int) -> Classroom:
    try:
        classroom_id = int(target_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identificador de turma inválido",
        )
    classroom = db.get(Classroom, classroom_id)
    if not classroom:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turma não encontrada",
        )
    return classroom


def _assert_subject_permission(
    current_user: UserPublic,
    db_user: User,
    subject: Subject,
) -> None:
    if current_user.role == "admin":
        return
    if current_user.role == "gestor":
        if not current_user.school_id or current_user.school_id != subject.school_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Gestores só podem enviar para matérias da própria unidade",
            )
        return
    if current_user.role == "professor":
        subject_ids = {s.id for s in db_user.teachable_subjects}
        if subject.id not in subject_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Professor não vinculado a esta matéria",
            )
        return
    if current_user.role == "aluno":
        classroom = db_user.classroom
        if not classroom:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Aluno sem turma vinculada",
            )
        allowed = set(classroom.subject_ids)
        if subject.id not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="A matéria selecionada não pertence à sua turma",
            )
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Seu perfil não pode enviar feedbacks para matérias",
    )


def _assert_class_permission(
    current_user: UserPublic,
    db_user: User,
    classroom: Classroom,
) -> None:
    if current_user.role == "admin":
        return
    if current_user.role == "gestor":
        if not current_user.school_id or current_user.school_id != classroom.school_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Gestores só podem enviar para turmas da própria unidade",
            )
        return
    if current_user.role == "professor":
        assigned_classroom_ids = {assignment.classroom_id for assignment in db_user.assignments}
        if classroom.id not in assigned_classroom_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Professor não vinculado a esta turma",
            )
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Seu perfil não pode enviar feedbacks para turmas",
    )


def _safe_int(value: str | int | None) -> int | None:
    """Attempt to cast arbitrary identifiers to integers."""
    if value is None:
        return None
    if isinstance(value, int):
        return value
    try:
        return int(str(value))
    except (TypeError, ValueError):
        return None


def _load_current_user_profile(db: Session, user_id: str) -> User:
    """Load the ORM user with relationships required for visibility checks."""
    user = (
        db.execute(
            select(User)
            .options(
                selectinload(User.teachable_subjects),
                selectinload(User.assignments)
                .selectinload(TeacherAssignment.classroom)
                .selectinload(Classroom.subjects),
                selectinload(User.classroom).selectinload(Classroom.subjects),
            )
            .where(User.id == user_id)
        )
        .scalar_one_or_none()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil não encontrado para o usuário autenticado",
        )
    return user


def _visible_subject_ids(
    current_user: UserPublic,
    db_user: User,
    db: Session,
) -> set[int]:
    """Return subject IDs the user can interact with or view."""
    if current_user.role == "admin":
        return set(db.scalars(select(Subject.id)).all())
    if current_user.role == "gestor":
        if not current_user.school_id:
            return set()
        return set(
            db.scalars(
                select(Subject.id).where(Subject.school_id == current_user.school_id)
            ).all()
        )
    if current_user.role == "professor":
        return {subject.id for subject in db_user.teachable_subjects}
    if current_user.role == "aluno":
        classroom = db_user.classroom
        if not classroom:
            return set()
        return set(classroom.subject_ids)
    return set()


def _visible_classroom_ids(
    current_user: UserPublic,
    db_user: User,
    db: Session,
) -> set[int]:
    """Return classroom IDs the user can reach."""
    if current_user.role == "admin":
        return set(db.scalars(select(Classroom.id)).all())
    if current_user.role == "gestor":
        if not current_user.school_id:
            return set()
        return set(
            db.scalars(
                select(Classroom.id).where(Classroom.school_id == current_user.school_id)
            ).all()
        )
    if current_user.role == "professor":
        return {assignment.classroom_id for assignment in db_user.assignments}
    if current_user.role == "aluno":
        return {db_user.classroom_id} if db_user.classroom_id else set()
    return set()


def _build_target_context(
    db: Session,
    feedbacks: list[Feedback],
) -> dict[int, dict[str, str | int | None]]:
    """Prepare human-friendly metadata for subjects, turmas ou usuários."""
    if not feedbacks:
        return {}

    user_ids = {fb.target_id for fb in feedbacks if fb.target_type == "user"}
    subject_ids = {
        subject_id
        for fb in feedbacks
        if fb.target_type == "subject"
        for subject_id in [_safe_int(fb.target_id)]
        if subject_id is not None
    }
    classroom_ids = {
        classroom_id
        for fb in feedbacks
        if fb.target_type == "class"
        for classroom_id in [_safe_int(fb.target_id)]
        if classroom_id is not None
    }

    user_map = (
        {
            user.id: user
            for user in db.execute(select(User).where(User.id.in_(user_ids))).scalars().all()
        }
        if user_ids
        else {}
    )
    subject_map = (
        {
            subject.id: subject
            for subject in db.execute(select(Subject).where(Subject.id.in_(subject_ids))).scalars().all()
        }
        if subject_ids
        else {}
    )
    classroom_map = (
        {
            classroom.id: classroom
            for classroom in db.execute(
                select(Classroom).where(Classroom.id.in_(classroom_ids))
            ).scalars().all()
        }
        if classroom_ids
        else {}
    )

    context: dict[int, dict[str, str | int | None]] = {}
    for feedback in feedbacks:
        if feedback.target_type == "user":
            user = user_map.get(feedback.target_id)
            context[feedback.id] = {
                "target_name": getattr(user, "full_name", None),
                "target_role": getattr(user, "role", None),
                "target_email": getattr(user, "email", None),
                "target_school_id": getattr(user, "school_id", None),
            }
        elif feedback.target_type == "subject":
            subject_id = _safe_int(feedback.target_id)
            subject = subject_map.get(subject_id)
            context[feedback.id] = {
                "target_name": getattr(subject, "name", None),
                "target_role": "subject",
                "target_email": None,
                "target_school_id": getattr(subject, "school_id", None),
            }
        elif feedback.target_type == "class":
            classroom_id = _safe_int(feedback.target_id)
            classroom = classroom_map.get(classroom_id)
            context[feedback.id] = {
                "target_name": getattr(classroom, "name", None),
                "target_role": "class",
                "target_email": None,
                "target_school_id": getattr(classroom, "school_id", None),
            }
        else:
            context[feedback.id] = {
                "target_name": None,
                "target_role": None,
                "target_email": None,
                "target_school_id": None,
            }
    return context


def _get_feedback_target_school_id(db: Session, feedback: Feedback) -> int | None:
    """Resolve the school related to the feedback target."""
    if feedback.target_type == "user":
        target_user = db.get(User, feedback.target_id)
        return getattr(target_user, "school_id", None)
    if feedback.target_type == "subject":
        subject = db.get(Subject, _safe_int(feedback.target_id))
        return getattr(subject, "school_id", None)
    if feedback.target_type == "class":
        classroom = db.get(Classroom, _safe_int(feedback.target_id))
        return getattr(classroom, "school_id", None)
    return None


def _school_scope_clause(
    school_id: int,
    sender_alias,
    target_alias,
):
    """Build a SQL clause ensuring sender or target belongs to the school."""
    subject_belongs = exists(
        select(Subject.id).where(
            Subject.id == cast(Feedback.target_id, Integer),
            Subject.school_id == school_id,
        )
    )
    classroom_belongs = exists(
        select(Classroom.id).where(
            Classroom.id == cast(Feedback.target_id, Integer),
            Classroom.school_id == school_id,
        )
    )
    return or_(
        sender_alias.school_id == school_id,
        and_(Feedback.target_type == "user", target_alias.school_id == school_id),
        and_(Feedback.target_type == "subject", subject_belongs),
        and_(Feedback.target_type == "class", classroom_belongs),
    )
