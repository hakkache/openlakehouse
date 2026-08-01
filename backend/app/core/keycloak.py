import logging
import time

import httpx
from jose import jwt
from jose.exceptions import JOSEError

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_jwks_cache: dict | None = None
_jwks_cache_time: float = 0.0
_JWKS_TTL_SECONDS = 300


def _oidc_config_url() -> str:
    settings = get_settings()
    return f"{settings.keycloak_internal_url}/realms/{settings.keycloak_realm}/.well-known/openid-configuration"


def get_jwks() -> dict:
    global _jwks_cache, _jwks_cache_time
    if _jwks_cache and (time.time() - _jwks_cache_time) < _JWKS_TTL_SECONDS:
        return _jwks_cache

    with httpx.Client(timeout=5.0) as client:
        oidc_config = client.get(_oidc_config_url()).json()
        jwks = client.get(oidc_config["jwks_uri"]).json()

    _jwks_cache = jwks
    _jwks_cache_time = time.time()
    return jwks


class TokenValidationError(Exception):
    pass


def decode_token(token: str) -> dict:
    """Validate a Keycloak-issued JWT against the realm's JWKS and return its claims."""
    settings = get_settings()
    try:
        jwks = get_jwks()
        unverified_header = jwt.get_unverified_header(token)
        key = next((k for k in jwks["keys"] if k["kid"] == unverified_header["kid"]), None)
        if key is None:
            raise TokenValidationError("Signing key not found in JWKS")

        claims = jwt.decode(
            token,
            key,
            algorithms=[key["alg"]] if "alg" in key else ["RS256"],
            audience=None,
            options={"verify_aud": False},
            issuer=f"{settings.keycloak_public_url}/realms/{settings.keycloak_realm}",
        )
        return claims
    except JOSEError as exc:
        logger.warning("Token validation failed: %s", exc)
        raise TokenValidationError(str(exc)) from exc


def check_keycloak_reachable() -> bool:
    try:
        get_jwks()
        return True
    except Exception:  # noqa: BLE001
        return False
