"""Router for managing chapter text edit proposals (CRUD)."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.models.proposal import (
    ChapterProposal,
    ChapterProposalCreate,
    ProposalStatusUpdate,
)
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
) -> list[ChapterProposal]:
    """List all proposals for a specific chapter."""
    logger.info("Listing proposals for %s/%s/%s", project_slug, part_slug, chapter_slug)
    data = read_json(_proposals_path(project_slug, part_slug, chapter_slug), [])
    # Backfill kind for proposals stored before the discriminator was added
    for p in data:
        p.setdefault("kind", "chapter")
    return [ChapterProposal(**p) for p in data]


@router.post("", status_code=201)
async def create_proposal(
    project_slug: str, part_slug: str, chapter_slug: str, body: ChapterProposalCreate
) -> ChapterProposal:
    """Create a new proposal for a specific chapter."""
    logger.info("Creating proposal for %s/%s/%s (source=%s)", project_slug, part_slug, chapter_slug, body.source)
    path = _proposals_path(project_slug, part_slug, chapter_slug)
    data = read_json(path, [])
    proposal = ChapterProposal(
        id=str(uuid.uuid4()),
        kind="chapter",
        source=body.source,
        source_label=body.source_label,
        original_text=body.original_text,
        proposed_text=body.proposed_text,
        proposal_type=body.proposal_type,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    data.append(proposal.model_dump())
    write_json(path, data)
    logger.info("Proposal created: %s", proposal.id)
    return proposal


@router.patch("/{proposal_id}")
async def update_proposal_status(
    project_slug: str, part_slug: str, chapter_slug: str,
    proposal_id: str, body: ProposalStatusUpdate
) -> ChapterProposal:
    """Update a proposal's status to accepted or declined."""
    logger.info("Updating proposal %s to %s in %s/%s/%s",
                proposal_id, body.status, project_slug, part_slug, chapter_slug)
    path = _proposals_path(project_slug, part_slug, chapter_slug)
    data = read_json(path, [])

    for p in data:
        if p["id"] == proposal_id:
            p["status"] = body.status
            p.setdefault("kind", "chapter")
            write_json(path, data)
            return ChapterProposal(**p)

    raise HTTPException(404, f"Proposal {proposal_id} not found")


@router.delete("/{proposal_id}")
async def delete_proposal(
    project_slug: str, part_slug: str, chapter_slug: str, proposal_id: str
):
    """Delete a proposal by its ID (kept for backward compatibility)."""
    logger.info("Deleting proposal %s from %s/%s/%s", proposal_id, project_slug, part_slug, chapter_slug)
    path = _proposals_path(project_slug, part_slug, chapter_slug)
    data = read_json(path, [])
    data = [p for p in data if p["id"] != proposal_id]
    write_json(path, data)
    return {"ok": True}
