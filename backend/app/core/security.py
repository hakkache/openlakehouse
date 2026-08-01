from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.keycloak import TokenValidationError, decode_token

bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser:
    def __init__(self, claims: dict) -> None:
        self.claims = claims
        self.subject: str = claims["sub"]
        self.username: str = claims.get("preferred_username", "")
        self.email: str = claims.get("email", "")
        self.roles: list[str] = claims.get("realm_access", {}).get("roles", [])

    def has_role(self, *roles: str) -> bool:
        return any(role in self.roles for role in roles)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    try:
        claims = decode_token(credentials.credentials)
    except TokenValidationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {exc}") from exc
    return CurrentUser(claims)


def require_roles(*allowed_roles: str):
    def _dependency(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not user.has_role(*allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(allowed_roles)}",
            )
        return user

    return _dependency
