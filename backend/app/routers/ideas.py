"""Router for managing chapter text edit ideas (CRUD)."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.models.idea import (
    ChapterIdea,
    ChapterIdeaCreate,
    IdeaStatusUpdate,
)
from app.services.storage import chapter_path, read_json, write_json

logger = logging.getLogger(__name__)
router = APIRouter()


def _ideas_path(project_slug: str, part_slug: str, chapter_slug: str):
    """Return the file path for a chapter's ideas JSON.

    Args:
        project_slug: The project identifier.
        part_slug: The part identifier.
        chapter_slug: The chapter identifier.
    """
    return chapter_path(project_slug, part_slug, chapter_slug) / "ideas.json"


@router.get("")
async def list_ideas(
    project_slug: str, part_slug: str, chapter_slug: str
) -> list[ChapterIdea]:
    """List all ideas for a specific chapter."""
    logger.info("Listing ideas for %s/%s/%s", project_slug, part_slug, chapter_slug)
    data = read_json(_ideas_path(project_slug, part_slug, chapter_slug), [])
    # Backfill kind for ideas stored before the discriminator was added
    for p in data:
        p.setdefault("kind", "chapter")
    return [ChapterIdea(**p) for p in data]


@router.post("", status_code=201)
async def create_idea(
    project_slug: str, part_slug: str, chapter_slug: str, body: ChapterIdeaCreate
) -> ChapterIdea:
    """Create a new idea for a specific chapter."""
    logger.info("Creating idea for %s/%s/%s (source=%s)", project_slug, part_slug, chapter_slug, body.source)
    path = _ideas_path(project_slug, part_slug, chapter_slug)
    data = read_json(path, [])
    idea = ChapterIdea(
        id=str(uuid.uuid4()),
        kind="chapter",
        source=body.source,
        source_label=body.source_label,
        original_text=body.original_text,
        proposed_text=body.proposed_text,
        idea_type=body.idea_type,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    data.append(idea.model_dump())
    write_json(path, data)
    logger.info("Idea created: %s", idea.id)
    return idea


@router.patch("/{idea_id}")
async def update_idea_status(
    project_slug: str, part_slug: str, chapter_slug: str,
    idea_id: str, body: IdeaStatusUpdate
) -> ChapterIdea:
    """Update a idea's status to accepted or declined."""
    logger.info("Updating idea %s to %s in %s/%s/%s",
                idea_id, body.status, project_slug, part_slug, chapter_slug)
    path = _ideas_path(project_slug, part_slug, chapter_slug)
    data = read_json(path, [])

    for p in data:
        if p["id"] == idea_id:
            p["status"] = body.status
            p.setdefault("kind", "chapter")
            write_json(path, data)
            return ChapterIdea(**p)

    raise HTTPException(404, f"Idea {idea_id} not found")


@router.delete("/{idea_id}")
async def delete_idea(
    project_slug: str, part_slug: str, chapter_slug: str, idea_id: str
):
    """Delete a idea by its ID (kept for backward compatibility)."""
    logger.info("Deleting idea %s from %s/%s/%s", idea_id, project_slug, part_slug, chapter_slug)
    path = _ideas_path(project_slug, part_slug, chapter_slug)
    data = read_json(path, [])
    data = [p for p in data if p["id"] != idea_id]
    write_json(path, data)
    return {"ok": True}
