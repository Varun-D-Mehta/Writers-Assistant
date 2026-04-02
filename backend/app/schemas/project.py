from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    title: str


class Project(BaseModel):
    slug: str
    title: str
    logo: str = ""
    created_at: datetime
    updated_at: datetime
