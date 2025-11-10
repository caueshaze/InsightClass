"""Prediction request/response schemas."""

from typing import List, Optional

from pydantic import BaseModel, Field


class PredictItem(BaseModel):
    texto: str = Field(..., min_length=3, description="Feedback em texto")
    author_role: Optional[str] = Field(
        default="aluno", description="aluno|professor|coordenador"
    )
    target_type: Optional[str] = Field(
        default="professor", description="professor|curso|turma|coordenacao"
    )
    course_code: Optional[str] = Field(
        default="", description="ex.: MAT-101 (opcional)"
    )


class PredictResponse(BaseModel):
    label: str
    confidence: Optional[float] = None


class PredictBatchRequest(BaseModel):
    items: List[PredictItem]


class PredictBatchResponseItem(BaseModel):
    index: int
    label: str
    confidence: Optional[float] = None


class PredictBatchResponse(BaseModel):
    results: List[PredictBatchResponseItem]
