from datetime import datetime

from pydantic import BaseModel


class ChatMessage(BaseModel):
    id: str
    role: str  # "user" | "assistant"
    content: str
    created_at: datetime


class ChatRequest(BaseModel):
    message: str
    chapter_content: dict | None = None
