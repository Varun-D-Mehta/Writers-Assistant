"""Router for managing chapter text edit proposals (CRUD)."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.schemas.proposal import Proposal, ProposalCreate
from app.services.storage import chapter_path, read_json, write_json

logger = logging.getLogger(__name__)
router = APIRouter()


def _proposals_path(project_slug: str, part_slug: str, chapter_slug: str):
    """Return the file path for a chapter's proposals JSON.

    Args:
        project_slug: The project identifier.
        part_slug: The part identifier.
        chapter_slug: The chapter identifier.
    """
    return chapter_path(project_slug, part_slug, chapter_slug) / "proposals.json"


@router.get("")
async def list_proposals(
    project_slug: str, part_slug: str, chapter_slug: str
) -> list[Proposal]:
    """List all proposals for a specific chapter."""
    logger.info("Listing proposals for %s/%s/%s", project_slug, part_slug, chapter_slug)
    data = read_json(_proposals_path(project_slug, part_slug, chapter_slug), [])
    return [Proposal(**p) for p in data]


@router.post("", status_code=201)
async def create_proposal(
    project_slug: str, part_slug: str, chapter_slug: str, body: ProposalCreate
) -> Proposal:
    """Create a new proposal for a specific chapter."""
    logger.info("Creating proposal for %s/%s/%s (source=%s)", project_slug, part_slug, chapter_slug, body.source)
    path = _proposals_path(project_slug, part_slug, chapter_slug)
    data = read_json(path, [])
    proposal = Proposal(
        id=str(uuid.uuid4()),
        source=body.source,
        source_label=body.source_label,
        original_text=body.original_text,
        proposed_text=body.proposed_text,
        created_at=datetime.now(timezone.utc),
    )
    data.append(proposal.model_dump())
    write_json(path, data)
    logger.info("Proposal created: %s", proposal.id)
    return proposal


@router.delete("/{proposal_id}")
async def delete_proposal(
    project_slug: str, part_slug: str, chapter_slug: str, proposal_id: str
):
    """Delete a proposal by its ID."""
    logger.info("Deleting proposal %s from %s/%s/%s", proposal_id, project_slug, part_slug, chapter_slug)
    path = _proposals_path(project_slug, part_slug, chapter_slug)
    data = read_json(path, [])
    data = [p for p in data if p["id"] != proposal_id]
    write_json(path, data)
    return {"ok": True}
