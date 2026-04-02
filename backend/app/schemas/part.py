from datetime import datetime

from pydantic import BaseModel


class PartCreate(BaseModel):
    title: str


class Part(BaseModel):
    slug: str
    title: str
    order: int
    created_at: datetime
