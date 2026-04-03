"""Router for generating AI-powered text edit ideas."""

import json
import logging

from fastapi import APIRouter

from app.models.idea import (
    BibleIdeaRequest,
    BibleIdeaResponse,
    ChapterIdeaResponse,
    IdeaRequest,
    IdeaResponse,
)
from app.services.ai_service import json_completion
from app.services.ideate_service import build_ideate_messages
from app.services.usage_service import record_usage

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/ideate")
async def generate_idea(body: IdeaRequest) -> IdeaResponse:
    """Generate an AI-powered text edit idea.

    Accepts either a ChapterIdeaRequest or BibleIdeaRequest
    (discriminated on the 'kind' field) and returns the matching response type.
    """
    logger.info("Generating %s idea (kind=%s) for project %s",
                body.idea_type, body.kind, body.project_slug)

    messages = build_ideate_messages(body)
    result = await json_completion(messages)
    record_usage(body.project_slug, "ideate", result)
    data = json.loads(result.content)

    if isinstance(body, BibleIdeaRequest):
        return BibleIdeaResponse(
            section=body.section,
            entry_index=body.entry_index,
            current_entry=data.get("current_entry", {}),
            ideated_entry=data.get("ideated_entry", data),
            idea_type=body.idea_type,
        )
    else:
        return ChapterIdeaResponse(
            original=data.get("original", ""),
            ideated=data.get("ideated", ""),
            idea_type=body.idea_type,
        )
