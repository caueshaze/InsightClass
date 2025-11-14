"""Symmetric encryption helpers for feedback payloads."""

from __future__ import annotations

import os
from base64 import b64decode, b64encode
from typing import Tuple

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .config import get_settings


def _cipher() -> AESGCM:
    settings = get_settings()
    return AESGCM(settings.encryption_key_bytes())


def encrypt_feedback(text: str) -> Tuple[str, str]:
    """Encrypt feedback content using AES-GCM and return (cipher, nonce)."""
    cipher = _cipher()
    nonce_bytes = os.urandom(12)
    ciphertext = cipher.encrypt(nonce_bytes, text.encode("utf-8"), None)
    return b64encode(ciphertext).decode("utf-8"), b64encode(nonce_bytes).decode("utf-8")


def decrypt_feedback(cipher_text: str, nonce: str) -> str:
    """Decrypt AES-GCM payloads. Returns empty string on failure."""
    if not cipher_text or not nonce:
        return ""
    try:
        cipher = _cipher()
        nonce_bytes = b64decode(nonce.encode("utf-8"))
        data = b64decode(cipher_text.encode("utf-8"))
        plaintext = cipher.decrypt(nonce_bytes, data, None)
        return plaintext.decode("utf-8")
    except Exception:  # pragma: no cover - defensive
        return ""
