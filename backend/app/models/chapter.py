from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ChapterCreate(BaseModel):
    title: str


class ChapterMeta(BaseModel):
    slug: str
    title: str
    part_slug: str
    order: int
    word_count: int = 0
    created_at: datetime
    updated_at: datetime


class ChapterContent(BaseModel):
    content: dict[str, Any]


class ChapterFull(BaseModel):
    meta: ChapterMeta
    content: dict[str, Any]
