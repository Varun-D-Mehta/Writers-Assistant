"""Idea models with discriminated unions for chapter and bible variants.

Hierarchy:
    IdeaRequest  = ChapterIdeaRequest  | BibleIdeaRequest   (kind discriminator)
    IdeaResponse = ChapterIdeaResponse | BibleIdeaResponse  (kind discriminator)
    IdeaCreate  = ChapterIdeaCreate  | BibleIdeaCreate   (kind discriminator)
    Idea        = ChapterIdea        | BibleIdea         (kind discriminator)
    IdeaStatusUpdate — shared, no union needed
"""

from datetime import datetime
from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field


# ── Ideate Request (AI generation input) ─────────────────────────


class BaseIdeaRequest(BaseModel):
    """Common fields for all AI idea generation requests."""
    project_slug: str
    instruction: str
    idea_type: str = "rewrite"


class ChapterIdeaRequest(BaseIdeaRequest):
    """Request to generate a chapter text edit idea."""
    kind: Literal["chapter"] = "chapter"
    chapter_content: str = ""
    selected_text: str | None = None


class BibleIdeaRequest(BaseIdeaRequest):
    """Request to generate a story bible entry idea."""
    kind: Literal["bible"] = "bible"
    section: str  # characters, events, environment, objects
    entry_index: int
    target_entry: str | None = None


class BibleIdeaRequestBody(BaseModel):
    """Body-only variant for the /story-bible/ideate endpoint where
    project_slug comes from the URL path instead of the request body."""
    section: str
    entry_index: int
    instruction: str
    idea_type: str = "rewrite"


IdeaRequest = Annotated[
    Union[ChapterIdeaRequest, BibleIdeaRequest],
    Field(discriminator="kind"),
]


# ── Ideate Response (AI generation output) ───────────────────────


class BaseIdeaResponse(BaseModel):
    """Common fields for all AI idea generation responses."""
    idea_type: str


class ChapterIdeaResponse(BaseIdeaResponse):
    """Response from chapter idea generation — original/ideated text pair."""
    kind: Literal["chapter"] = "chapter"
    original: str
    ideated: str


class BibleIdeaResponse(BaseIdeaResponse):
    """Response from bible idea generation — full entry replacement."""
    kind: Literal["bible"] = "bible"
    section: str
    entry_index: int
    current_entry: dict
    proposed_entry: dict


IdeaResponse = Annotated[
    Union[ChapterIdeaResponse, BibleIdeaResponse],
    Field(discriminator="kind"),
]


# ── Idea Create (persist a idea) ──────────────────────────


class BaseIdeaCreate(BaseModel):
    """Common fields for creating a stored idea."""
    source_label: str
    idea_type: str = "rewrite"


class ChapterIdeaCreate(BaseIdeaCreate):
    """Create a chapter text edit idea."""
    kind: Literal["chapter"] = "chapter"
    source: str  # "chat" | "context-check"
    original_text: str
    proposed_text: str


class BibleIdeaCreate(BaseIdeaCreate):
    """Create a story bible entry idea."""
    kind: Literal["bible"] = "bible"
    section: str
    entry_index: int
    current_entry: dict
    proposed_entry: dict


IdeaCreate = Annotated[
    Union[ChapterIdeaCreate, BibleIdeaCreate],
    Field(discriminator="kind"),
]


# ── Stored Idea (persisted with status) ───────────────────────


class BaseIdea(BaseModel):
    """Common fields for all stored ideas."""
    id: str
    source_label: str
    idea_type: str = "rewrite"
    status: Literal["pending", "accepted", "declined"] = "pending"
    created_at: datetime | str


class ChapterIdea(BaseIdea):
    """A persisted chapter text edit idea."""
    kind: Literal["chapter"] = "chapter"
    source: str  # "chat" | "context-check"
    original_text: str
    proposed_text: str


class BibleIdea(BaseIdea):
    """A persisted story bible entry idea."""
    kind: Literal["bible"] = "bible"
    section: str
    entry_index: int
    current_entry: dict
    proposed_entry: dict


Idea = Annotated[
    Union[ChapterIdea, BibleIdea],
    Field(discriminator="kind"),
]


# ── Status Update (shared) ────────────────────────────────────────


class IdeaStatusUpdate(BaseModel):
    """Update a idea's status to accepted or declined."""
    status: Literal["accepted", "declined"]
