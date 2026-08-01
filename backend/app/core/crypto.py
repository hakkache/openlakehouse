"""Symmetric encryption for at-rest secrets (e.g. Connection Management passwords).

Uses Fernet (AES-128-CBC + HMAC) with a key derived from `backend_secret_key`
(or `connection_encryption_key` if explicitly set) via SHA-256, so no extra key
management is required beyond the secret already used elsewhere in the app.
Encrypted values are never returned by any API response.
"""

import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


@lru_cache
def _fernet() -> Fernet:
    settings = get_settings()
    raw = settings.connection_encryption_key or settings.backend_secret_key
    key = base64.urlsafe_b64encode(hashlib.sha256(raw.encode("utf-8")).digest())
    return Fernet(key)


def encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Failed to decrypt stored secret") from exc
