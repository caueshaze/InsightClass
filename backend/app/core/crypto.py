"""Lightweight placeholders for cryptographic helpers.

These functions intentionally perform reversible, non-secure transformations so
the rest of the application can be wired. They MUST be replaced by AES-GCM or
similar strong primitives before production rollout.
"""

from base64 import b64decode, b64encode
import secrets
from typing import Tuple


def encrypt_feedback(text: str) -> Tuple[str, str]:
    """Serialize feedback text for storage (placeholder)."""
    # TODO: Replace base64 encoding with proper AES-GCM encryption.
    nonce = secrets.token_hex(12)
    cipher_text = b64encode(text.encode("utf-8")).decode("utf-8")
    return cipher_text, nonce


def decrypt_feedback(cipher_text: str, nonce: str) -> str:
    """Restore original feedback text (placeholder)."""
    # TODO: Validate nonce and decrypt using the real key material.
    try:
        return b64decode(cipher_text.encode("utf-8")).decode("utf-8")
    except Exception:  # pragma: no cover - placeholder
        return ""

