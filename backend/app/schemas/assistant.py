from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    message: ChatMessage
    model: str


class AssistantStatus(BaseModel):
    available: bool
    model: str
    detail: str | None = None
