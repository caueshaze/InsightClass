"""Sentiment prediction endpoints."""

from typing import Any, List, Optional

import joblib
from fastapi import APIRouter, Depends, HTTPException, status

from ...core.config import Settings, get_settings
from ...core.security import require_role
from ...core.text import build_context_text
from ...schemas import (
    PredictBatchRequest,
    PredictBatchResponse,
    PredictBatchResponseItem,
    PredictItem,
    PredictResponse,
)

router = APIRouter(prefix="/predict", tags=["predict"])

_model: Optional[Any] = None


def load_model(settings: Settings) -> Any:
    """Load the ML model from disk (cached)."""
    global _model
    if _model is None:
        try:
            _model = joblib.load(settings.model_path)
        except Exception as exc:
            raise RuntimeError(
                f"Não foi possível carregar o modelo em {settings.model_path}: {exc}"
            ) from exc
    return _model


@router.get("/health", summary="Verifica a saúde da API")
def health(settings: Settings = Depends(get_settings)) -> dict:
    model_loaded = True
    try:
        load_model(settings)
    except RuntimeError:
        model_loaded = False
    return {"status": "ok", "model_loaded": model_loaded}


@router.get("/version", summary="Retorna a versão da API e do modelo")
def version(settings: Settings = Depends(get_settings)) -> dict:
    return {"api_version": settings.api_version, "model_path": settings.model_path}


@router.post(
    "/predict",
    response_model=PredictResponse,
    dependencies=[Depends(require_role("professor", "gestor", "admin", "aluno"))],
    summary="Prevê o sentimento de um único texto",
)
def predict(
    item: PredictItem,
    settings: Settings = Depends(get_settings),
) -> PredictResponse:
    model = load_model(settings)
    try:
        text_ctx = build_context_text(
            texto=item.texto,
            author_role=item.author_role,
            target_type=item.target_type,
            course_code=item.course_code,
        )

        text_list = [text_ctx]
        label = model.predict(text_list)[0]

        conf = None
        if hasattr(model, "predict_proba"):
            probabilities = model.predict_proba(text_list)[0]
            conf = float(max(probabilities))

        return PredictResponse(label=str(label), confidence=conf)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro na predição: {exc}",
        ) from exc


@router.post(
    "/predict_batch",
    response_model=PredictBatchResponse,
    dependencies=[Depends(require_role("gestor", "admin"))],
    summary="Prevê o sentimento de múltiplos textos",
)
def predict_batch(
    payload: PredictBatchRequest,
    settings: Settings = Depends(get_settings),
) -> PredictBatchResponse:
    model = load_model(settings)
    try:
        texts: List[str] = [
            build_context_text(
                texto=item.texto,
                author_role=item.author_role,
                target_type=item.target_type,
                course_code=item.course_code,
            )
            for item in payload.items
        ]
        labels = model.predict(texts)

        confs = None
        if hasattr(model, "predict_proba"):
            confs = model.predict_proba(texts).max(axis=1)

        results = [
            PredictBatchResponseItem(
                index=idx,
                label=str(lab),
                confidence=float(confs[idx]) if confs is not None else None,
            )
            for idx, lab in enumerate(labels)
        ]
        return PredictBatchResponse(results=results)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro na predição em lote: {exc}",
        ) from exc
