import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import get_settings
from app.core.security import CurrentUser, get_current_user
from app.schemas.assistant import AssistantStatus, ChatMessage, ChatRequest, ChatResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assistant", tags=["assistant"])

SYSTEM_PROMPT = (
    "You are the OpenLakehouse AI Assistant, embedded in a self-hosted "
    "data and AI lakehouse platform (Spark, Trino, Iceberg, dbt, Kafka, "
    "Dagster). Answer concisely and help the user with data engineering, "
    "SQL, and pipeline questions."
)


@router.get("/status", response_model=AssistantStatus)
def assistant_status() -> AssistantStatus:
    settings = get_settings()
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(f"{settings.ollama_url}/api/tags")
            resp.raise_for_status()
            tags = [m.get("name") for m in resp.json().get("models", [])]
        available = settings.ollama_model in tags
        detail = None if available else f"model not pulled yet (have: {tags})"
        return AssistantStatus(available=available, model=settings.ollama_model, detail=detail)
    except Exception as exc:  # noqa: BLE001
        logger.warning("ollama status check failed: %s", exc)
        return AssistantStatus(available=False, model=settings.ollama_model, detail=str(exc))


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, _user: CurrentUser = Depends(get_current_user)) -> ChatResponse:
    settings = get_settings()
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + [
        {"role": m.role, "content": m.content} for m in payload.messages
    ]
    try:
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(
                f"{settings.ollama_url}/api/chat",
                json={"model": settings.ollama_model, "messages": messages, "stream": False},
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as exc:
        logger.exception("ollama chat request failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI assistant (Ollama) unreachable: {exc}",
        ) from exc

    reply = data.get("message", {})
    return ChatResponse(
        message=ChatMessage(role=reply.get("role", "assistant"), content=reply.get("content", "")),
        model=settings.ollama_model,
    )
