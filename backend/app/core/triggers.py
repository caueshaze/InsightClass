"""Simple trigger detection helpers."""

from __future__ import annotations

from typing import List

PROHIBITED_KEYWORDS = {"violencia", "bullying", "ameaça", "perigo"}


def detect_triggers(text: str) -> List[str]:
    """Return a list of matched trigger keywords based on naive substring checks."""
    # TODO: Replace with ML-based detection leveraging the ONNX model.
    lowered = text.lower()
    return [keyword for keyword in PROHIBITED_KEYWORDS if keyword in lowered]

