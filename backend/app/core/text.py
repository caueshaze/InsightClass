"""Text preprocessing helpers used before inference."""

from typing import Optional


def build_context_text(
    *,
    texto: str,
    author_role: Optional[str] = None,
    target_type: Optional[str] = None,
    course_code: Optional[str] = None,
) -> str:
    """
    Compose a deterministic text payload used by the ML model.

    This is intentionally lightweight so unit tests can patch or extend the
    behavior until the original NLP utilities are migrated into this package.
    """

    segments = [texto.strip()]
    if author_role:
        segments.append(f"[author={author_role}]")
    if target_type:
        segments.append(f"[target={target_type}]")
    if course_code:
        segments.append(f"[course={course_code}]")
    return " ".join(filter(None, segments))
