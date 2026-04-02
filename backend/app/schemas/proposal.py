from datetime import datetime

from pydantic import BaseModel


class ProposalCreate(BaseModel):
    source: str  # "chat" | "context-check"
    source_label: str
    original_text: str
    proposed_text: str
    proposal_type: str = "rewrite"


class Proposal(BaseModel):
    id: str
    source: str
    source_label: str
    original_text: str
    proposed_text: str
    proposal_type: str = "rewrite"
    created_at: datetime
