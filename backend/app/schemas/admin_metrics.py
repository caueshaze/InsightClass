"""Schemas for admin metrics endpoints."""

from datetime import datetime
from pydantic import BaseModel, Field


class AdminMetricCounts(BaseModel):
    total_users: int
    total_schools: int
    total_classrooms: int
    total_subjects: int
    total_feedbacks: int


class AdminTriggerStats(BaseModel):
    active_alerts: int
    resolved_alerts_30d: int


class AdminFeedbackSnapshot(BaseModel):
    feedbacks_24h: int
    feedbacks_7d: int
    last_feedback_at: datetime | None = Field(default=None)


class AdminMetricsOverview(BaseModel):
    counts: AdminMetricCounts
    triggers: AdminTriggerStats
    feedback: AdminFeedbackSnapshot


class AdminHealthMetrics(BaseModel):
    timestamp: datetime
    db_latency_ms: float
    api_latency_ms: float
    onnx_latency_ms: float | None = None
    gemma_latency_ms: float | None = None
