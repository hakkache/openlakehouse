from pydantic import BaseModel

from app.core.security import CurrentUser


class MeResponse(BaseModel):
    subject: str
    username: str
    email: str
    roles: list[str]


def to_me_response(user: CurrentUser) -> MeResponse:
    return MeResponse(subject=user.subject, username=user.username, email=user.email, roles=user.roles)
