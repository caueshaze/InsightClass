"""Monitoring endpoints for administrators."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from ....core.config import get_settings
from ....core import llm
from ....core.database import get_session
from ....models import Classroom, Feedback, School, Subject, User
from ....schemas.admin_metrics import AdminHealthMetrics, AdminMetricsOverview
from ....schemas.user import UserPublic
from .deps import require_admin_user

router = APIRouter(prefix="/metrics")


def _measure_onnx_latency() -> float | None:
    from ....core.sentiment import SentimentAnalyzer

    settings = get_settings()
    try:
        analyzer = SentimentAnalyzer(settings)
        start = datetime.utcnow()
        analyzer.predict("Texto curto para medir desempenho.")
        return (datetime.utcnow() - start).total_seconds() * 1000
    except Exception:  # pragma: no cover - depende de runtime
        return None


@router.get(
    "/overview",
    response_model=AdminMetricsOverview,
    summary="Resumo global com contagens e gatilhos",
)
def get_admin_metrics_overview(
    _: UserPublic = Depends(require_admin_user("admin")),
    db: Session = Depends(get_session),
) -> AdminMetricsOverview:
    total_users = db.scalar(select(func.count(User.id))) or 0
    total_schools = db.scalar(select(func.count(School.id))) or 0
    total_classrooms = db.scalar(select(func.count(Classroom.id))) or 0
    total_subjects = db.scalar(select(func.count(Subject.id))) or 0
    total_feedbacks = db.scalar(select(func.count(Feedback.id))) or 0

    now = datetime.utcnow()
    active_alerts = db.scalar(
        select(func.count(Feedback.id)).where(
            Feedback.has_trigger.is_(True),
            Feedback.trigger_resolved_at.is_(None),
        )
    ) or 0
    resolved_alerts = db.scalar(
        select(func.count(Feedback.id)).where(
            Feedback.trigger_resolved_at.is_not(None),
            Feedback.trigger_resolved_at >= now - timedelta(days=30),
        )
    ) or 0

    feedbacks_24h = db.scalar(
        select(func.count(Feedback.id)).where(
            Feedback.created_at >= now - timedelta(hours=24)
        )
    ) or 0
    feedbacks_7d = db.scalar(
        select(func.count(Feedback.id)).where(
            Feedback.created_at >= now - timedelta(days=7)
        )
    ) or 0
    last_feedback_at = db.scalar(select(func.max(Feedback.created_at)))

    return AdminMetricsOverview(
        counts={
            "total_users": total_users,
            "total_schools": total_schools,
            "total_classrooms": total_classrooms,
            "total_subjects": total_subjects,
            "total_feedbacks": total_feedbacks,
        },
        triggers={
            "active_alerts": active_alerts,
            "resolved_alerts_30d": resolved_alerts,
        },
        feedback={
            "feedbacks_24h": feedbacks_24h,
            "feedbacks_7d": feedbacks_7d,
            "last_feedback_at": last_feedback_at,
        },
    )


@router.get(
    "/health",
    response_model=AdminHealthMetrics,
    summary="Latências reais da API, banco e modelos",
)
def get_admin_metrics_health(
    _: UserPublic = Depends(require_admin_user("admin")),
    db: Session = Depends(get_session),
) -> AdminHealthMetrics:
    settings = get_settings()

    start_total = datetime.utcnow()
    start_db = datetime.utcnow()
    db.execute(text("SELECT 1"))
    db_latency_ms = (datetime.utcnow() - start_db).total_seconds() * 1000
    api_latency_ms = (datetime.utcnow() - start_total).total_seconds() * 1000

    onnx_latency_ms = _measure_onnx_latency()
    gemma_latency_ms = llm.measure_llm_latency()

    return AdminHealthMetrics(
        timestamp=datetime.utcnow(),
        db_latency_ms=round(db_latency_ms, 2),
        api_latency_ms=round(api_latency_ms, 2),
        onnx_latency_ms=round(onnx_latency_ms, 2) if onnx_latency_ms is not None else None,
        gemma_latency_ms=round(gemma_latency_ms, 2) if gemma_latency_ms is not None else None,
    )
