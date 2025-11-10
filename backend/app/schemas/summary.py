"""Schemas for AI-generated summaries (Gemma integration placeholder)."""

from pydantic import BaseModel


class FeedbackSummary(BaseModel):
    summary_text: str
    positives: list[str] = []
    opportunities: list[str] = []
    gemma_ready: bool = False
