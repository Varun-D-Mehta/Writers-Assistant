"""Proposal models with discriminated unions for chapter and bible variants.

Hierarchy:
    ProposeRequest  = ChapterProposeRequest  | BibleProposeRequest   (kind discriminator)
    ProposeResponse = ChapterProposeResponse | BibleProposeResponse  (kind discriminator)
    ProposalCreate  = ChapterProposalCreate  | BibleProposalCreate   (kind discriminator)
    Proposal        = ChapterProposal        | BibleProposal         (kind discriminator)
    ProposalStatusUpdate — shared, no union needed
"""

from datetime import datetime
from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field


# ── Propose Request (AI generation input) ─────────────────────────


class BaseProposeRequest(BaseModel):
    """Common fields for all AI proposal generation requests."""
    project_slug: str
    instruction: str
    proposal_type: str = "rewrite"


class ChapterProposeRequest(BaseProposeRequest):
    """Request to generate a chapter text edit proposal."""
    kind: Literal["chapter"] = "chapter"
    chapter_content: str = ""
    selected_text: str | None = None


class BibleProposeRequest(BaseProposeRequest):
    """Request to generate a story bible entry proposal."""
    kind: Literal["bible"] = "bible"
    section: str  # characters, events, environment, objects
    entry_index: int
    target_entry: str | None = None


class BibleProposeRequestBody(BaseModel):
    """Body-only variant for the /story-bible/propose endpoint where
    project_slug comes from the URL path instead of the request body."""
    section: str
    entry_index: int
    instruction: str
    proposal_type: str = "rewrite"


ProposeRequest = Annotated[
    Union[ChapterProposeRequest, BibleProposeRequest],
    Field(discriminator="kind"),
]


# ── Propose Response (AI generation output) ───────────────────────


class BaseProposeResponse(BaseModel):
    """Common fields for all AI proposal generation responses."""
    proposal_type: str


class ChapterProposeResponse(BaseProposeResponse):
    """Response from chapter proposal generation — original/proposed text pair."""
    kind: Literal["chapter"] = "chapter"
    original: str
    proposed: str


class BibleProposeResponse(BaseProposeResponse):
    """Response from bible proposal generation — full entry replacement."""
    kind: Literal["bible"] = "bible"
    section: str
    entry_index: int
    current_entry: dict
    proposed_entry: dict


ProposeResponse = Annotated[
    Union[ChapterProposeResponse, BibleProposeResponse],
    Field(discriminator="kind"),
]


# ── Proposal Create (persist a proposal) ──────────────────────────


class BaseProposalCreate(BaseModel):
    """Common fields for creating a stored proposal."""
    source_label: str
    proposal_type: str = "rewrite"


class ChapterProposalCreate(BaseProposalCreate):
    """Create a chapter text edit proposal."""
    kind: Literal["chapter"] = "chapter"
    source: str  # "chat" | "context-check"
    original_text: str
    proposed_text: str


class BibleProposalCreate(BaseProposalCreate):
    """Create a story bible entry proposal."""
    kind: Literal["bible"] = "bible"
    section: str
    entry_index: int
    current_entry: dict
    proposed_entry: dict


ProposalCreate = Annotated[
    Union[ChapterProposalCreate, BibleProposalCreate],
    Field(discriminator="kind"),
]


# ── Stored Proposal (persisted with status) ───────────────────────


class BaseProposal(BaseModel):
    """Common fields for all stored proposals."""
    id: str
    source_label: str
    proposal_type: str = "rewrite"
    status: Literal["pending", "accepted", "declined"] = "pending"
    created_at: datetime | str


class ChapterProposal(BaseProposal):
    """A persisted chapter text edit proposal."""
    kind: Literal["chapter"] = "chapter"
    source: str  # "chat" | "context-check"
    original_text: str
    proposed_text: str


class BibleProposal(BaseProposal):
    """A persisted story bible entry proposal."""
    kind: Literal["bible"] = "bible"
    section: str
    entry_index: int
    current_entry: dict
    proposed_entry: dict


Proposal = Annotated[
    Union[ChapterProposal, BibleProposal],
    Field(discriminator="kind"),
]


# ── Status Update (shared) ────────────────────────────────────────


class ProposalStatusUpdate(BaseModel):
    """Update a proposal's status to accepted or declined."""
    status: Literal["accepted", "declined"]
