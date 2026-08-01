from fastapi import APIRouter, Depends

from app.core.security import CurrentUser, get_current_user
from app.schemas.auth import MeResponse, to_me_response

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=MeResponse)
def me(user: CurrentUser = Depends(get_current_user)) -> MeResponse:
    return to_me_response(user)
