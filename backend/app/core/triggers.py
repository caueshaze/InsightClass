"""Simple trigger detection helpers."""

from __future__ import annotations

from typing import Iterable, List, Set

from sqlalchemy.orm import Session

from ..models.trigger import TriggerKeyword

DEFAULT_TRIGGER_KEYWORDS = {"violencia", "bullying", "ameaça", "perigo"}


def load_trigger_keywords(db: Session, school_id: int | None) -> Set[str]:
    """Return the union of global and school-specific keywords."""
    query = db.query(TriggerKeyword.keyword).filter(TriggerKeyword.school_id.is_(None))
    global_keywords = {row[0] for row in query.all()}

    scoped_keywords: Set[str] = set()
    if school_id is not None:
        scoped_query = (
            db.query(TriggerKeyword.keyword)
            .filter(TriggerKeyword.school_id == school_id)
        )
        scoped_keywords = {row[0] for row in scoped_query.all()}

    return {
        *(keyword.lower() for keyword in DEFAULT_TRIGGER_KEYWORDS),
        *(keyword.lower() for keyword in global_keywords),
        *(keyword.lower() for keyword in scoped_keywords),
    }


def detect_triggers(text: str, keywords: Iterable[str]) -> List[str]:
    """Return a list of matched trigger keywords based on naive substring checks."""
    lowered = text.lower()
    normalized_keywords = [keyword.lower() for keyword in keywords]
    return [keyword for keyword in normalized_keywords if keyword and keyword in lowered]
