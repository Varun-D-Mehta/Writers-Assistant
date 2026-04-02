"""Router for running context consistency checks on chapters."""

import json
import logging

from fastapi import APIRouter

from app.schemas.context_check import ContextCheckRequest, ContextCheckResponse
from app.services.ai_service import json_completion
from app.services.context_check_service import build_context_check_prompt

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/context-check")
async def run_context_check(body: ContextCheckRequest) -> ContextCheckResponse:
    """Run a context consistency check on a chapter against the story bible.

    Identifies inconsistencies between the chapter content and the
    story bible entries.
    """
    logger.info("Running context check for %s/%s/%s", body.project_slug, body.part_slug, body.chapter_slug)
    messages = build_context_check_prompt(
        body.project_slug, body.part_slug, body.chapter_slug
    )
    result = await json_completion(messages)
    data = json.loads(result)
    issues = data.get("issues", [])
    logger.info("Context check found %d issues for %s/%s/%s", len(issues), body.project_slug, body.part_slug, body.chapter_slug)
    return ContextCheckResponse(issues=issues)
