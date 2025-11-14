from __future__ import annotations

import logging
import math
import os
from functools import lru_cache
from pathlib import Path
from typing import Optional, Tuple, TYPE_CHECKING, Any, Dict

import numpy as np  # type: ignore
import httpx  # NEW: cliente HTTP para chamar o servidor ONNX remoto

from .config import Settings, get_settings

LOGGER = logging.getLogger(__name__)

SENTIMENT_LABELS = ("negative", "neutral", "positive")
PORTUGUESE_LABELS = {
    "negative": "negativo",
    "neutral": "neutro",
    "positive": "positivo",
}
DEFAULT_SENTIMENT: Tuple[str, float] = ("neutro", 0.0)

# ===== CONFIG REMOTA =====
REMOTE_SENTIMENT_URL = os.getenv("SENTIMENT_API_URL", "").strip()
REMOTE_SENTIMENT_KEY = os.getenv("SENTIMENT_API_KEY", "").strip()

try:
    import onnxruntime as ort  # type: ignore
except Exception:
    ort = None  # type: ignore[assignment]

try:
    from transformers import AutoTokenizer  # type: ignore
except Exception:
    AutoTokenizer = None  # type: ignore[assignment]

if TYPE_CHECKING:
    from onnxruntime import InferenceSession  # type: ignore
else:
    InferenceSession = Any


class SentimentAnalyzer:
    """
    Versão original: carrega modelo ONNX local.
    Continua existindo como fallback (desenvolvimento/local ou erro no remoto).
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._session: Optional[InferenceSession] = None
        self._input_name: Optional[str] = None
        self._onnx_inputs: Tuple[Any, ...] = ()
        self._input_names: Tuple[str, ...] = ()
        self._use_transformer_style: bool = False
        self._tokenizer: Optional[Any] = None
        self._init_logged: bool = False  # pra não floodar log

    def _ensure_session(self) -> None:
        if self._session is not None or self._init_logged:
            return

        self._init_logged = True  # qualquer resultado, só loga na primeira vez

        if ort is None:
            LOGGER.info("onnxruntime ausente. Sentimento usará apenas heurística.")
            return

        model_path = Path(self._settings.sentiment_model_path)
        if not model_path.exists():
            LOGGER.info(
                "Nenhum modelo de sentimento ONNX encontrado em %s. Usando heurística.",
                model_path,
            )
            return

        try:
            session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])  # type: ignore[attr-defined]
            inputs = session.get_inputs()
            if not inputs:
                LOGGER.info("Modelo ONNX de sentimento sem entradas. Ignorando, usando heurística.")
                return

            self._onnx_inputs = tuple(inputs)
            self._input_names = tuple(i.name for i in inputs)
            input_names = set(self._input_names)

            # Modelo BERT-like → só usamos se houver transformers + tokenizer
            if "input_ids" in input_names and "attention_mask" in input_names:
                if not self._load_tokenizer(model_path.parent):
                    return
                self._session = session
                self._use_transformer_style = True
                LOGGER.info(
                    "Modelo de sentimento BERT-like carregado de %s.",
                    model_path,
                )
                return

            # Modelo simples: um input só
            if len(inputs) == 1:
                self._session = session
                self._input_name = inputs[0].name
                self._use_transformer_style = False
                LOGGER.info(
                    "Modelo de sentimento single-input carregado de %s (input=%s).",
                    model_path,
                    self._input_name,
                )
                return

            # Qualquer outra coisa estranha → heurística
            LOGGER.info(
                "Modelo de sentimento ONNX com múltiplas entradas não suportadas (%s). Usando heurística.",
                ", ".join(sorted(input_names)),
            )

        except Exception as exc:
            LOGGER.info(
                "Erro ao inicializar modelo de sentimento ONNX (%s). Usando heurística.",
                exc,
            )
            self._session = None
            self._input_name = None
            self._use_transformer_style = False
            self._tokenizer = None
            self._input_names = ()

    def _load_tokenizer(self, directory: Path) -> bool:
        if AutoTokenizer is None:
            LOGGER.info(
                "Modelo de sentimento requer tokenizer (BERT-like), mas 'transformers' não está instalado. "
                "Mantendo apenas heurística."
            )
            return False

        try:
            self._tokenizer = AutoTokenizer.from_pretrained(
                str(directory),
                local_files_only=True,
            )
            return True
        except Exception as exc:
            LOGGER.info(
                "Falha ao carregar tokenizer para modelo de sentimento em %s (%s). Usando apenas heurística.",
                directory,
                exc,
            )
            self._tokenizer = None
            self._use_transformer_style = False
            return False

    def _build_transformer_inputs(self, text: str) -> Optional[Dict[str, Any]]:
        if not self._tokenizer or not self._onnx_inputs:
            return None

        try:
            encoded = self._tokenizer(
                text,
                return_tensors="np",
                padding="max_length",
                truncation=True,
                max_length=256,
            )
        except Exception as exc:
            LOGGER.info("Falha ao tokenizar texto para sentimento (%s).", exc)
            return None

        feed: Dict[str, Any] = {}
        input_names = set(self._input_names)

        for input_def in self._onnx_inputs:
            name = input_def.name
            if name in encoded:
                feed[name] = encoded[name].astype("int64", copy=False)
                continue

            if name == "token_type_ids" and "input_ids" in feed:
                feed[name] = np.zeros_like(feed["input_ids"], dtype="int64")
                continue

            if name == "token_type_ids" and "input_ids" in encoded:
                feed["input_ids"] = encoded["input_ids"].astype("int64", copy=False)
                feed[name] = np.zeros_like(feed["input_ids"], dtype="int64")
                continue

            LOGGER.debug("Tokenizer não forneceu entrada obrigatória '%s'.", name)
            return None

        return feed

    def predict(self, text: str) -> Tuple[Optional[str], Optional[float]]:
        self._ensure_session()

        if not self._session:
            return _heuristic_sentiment(text)

        try:
            if self._use_transformer_style:
                feed = self._build_transformer_inputs(text)
                if not feed:
                    return _heuristic_sentiment(text)
                outputs = self._session.run(None, feed)
            else:
                if not self._input_name or len(self._onnx_inputs) != 1:
                    return _heuristic_sentiment(text)
                outputs = self._session.run(None, {self._input_name: [text]})

            if not outputs:
                return _heuristic_sentiment(text)

            scores = outputs[0][0]
            probs = _softmax(scores)
            max_index = max(range(len(probs)), key=probs.__getitem__)
            raw_label = SENTIMENT_LABELS[min(max_index, len(SENTIMENT_LABELS) - 1)]
            label = PORTUGUESE_LABELS.get(raw_label, "neutro")
            return label, float(probs[max_index])
        except Exception as exc:
            LOGGER.info("Erro durante inferência ONNX local (%s). Caindo para heurística.", exc)
            return _heuristic_sentiment(text)


def _softmax(logits) -> Tuple[float, ...]:
    if logits is None:
        n = len(SENTIMENT_LABELS)
        return tuple(1.0 / n for _ in range(n))
    values = [float(x) for x in logits]
    m = max(values)
    exps = [math.exp(v - m) for v in values]
    s = sum(exps) or 1.0
    return tuple(v / s for v in exps)


def _heuristic_sentiment(text: str) -> Tuple[str, float]:
    lowered = text.lower()
    positive_tokens = (
        "excelente",
        "bom",
        "ótimo",
        "maravilhoso",
        "gostei",
        "aprendi",
        "feliz",
        "incrível",
        "agradável",
    )
    negative_tokens = (
        "ruim",
        "péssimo",
        "horrível",
        "triste",
        "não gostei",
        "pior",
        "problema",
        "raiva",
        "decepcionado",
    )
    pos_hits = sum(t in lowered for t in positive_tokens)
    neg_hits = sum(t in lowered for t in negative_tokens)

    if pos_hits == 0 and neg_hits == 0:
        return DEFAULT_SENTIMENT
    if pos_hits > neg_hits:
        score = min(1.0, 1.0 if pos_hits >= 4 else 0.6 + 0.1 * pos_hits)
        return "positivo", score
    score = min(1.0, 1.0 if neg_hits >= 4 else 0.6 + 0.1 * neg_hits)
    return "negativo", score


@lru_cache(maxsize=1)
def get_sentiment_analyzer() -> SentimentAnalyzer:
    return SentimentAnalyzer(get_settings())


def _remote_sentiment(text: str) -> Tuple[Optional[str], Optional[float]]:
    """
    Se SENTIMENT_API_URL estiver configurada (via Settings/Pydantic),
    tenta usar o servidor remoto (VM ONNX).
    Em caso de erro, cai para o modelo local ou heur�stica.
    """
    settings = get_settings()
    url = settings.sentiment_api_url.strip()
    key = settings.sentiment_api_key.strip()

    if not url:
        # Sem URL remota \u2192 volta para o comportamento antigo (local/heur�stica)
        return get_sentiment_analyzer().predict(text)

    try:
        LOGGER.info("Chamando servidor remoto de sentimento em %s", url)

        resp = httpx.post(
            url,
            json={"text": text},
            headers={"X-API-Key": key} if key else {},
            timeout=5.0,
        )
        resp.raise_for_status()
        data = resp.json()
        raw_label = str(data.get("label", "")).lower()
        score_raw = data.get("score")

        if score_raw is None or not raw_label:
            LOGGER.info("Resposta remota de sentimento incompleta. Caindo para local/heur�stica.")
            return get_sentiment_analyzer().predict(text)

        label_pt = PORTUGUESE_LABELS.get(raw_label, raw_label)
        try:
            score = float(score_raw)
        except (TypeError, ValueError):
            score = 0.0

        return label_pt, score
    except Exception as exc:
        LOGGER.info(
            "Falha ao chamar servidor remoto de sentimento (%s). Caindo para local/heur�stica.",
            exc,
        )
        return get_sentiment_analyzer().predict(text)

def analyze_sentiment(text: str) -> Tuple[Optional[str], Optional[float]]:
    """
    Função pública usada pelo resto do código.
    Agora:
      - se SENTIMENT_API_URL estiver setada → usa IA remota
      - senão → usa IA local (ONNX) + heurística como antes
    """
    return _remote_sentiment(text)