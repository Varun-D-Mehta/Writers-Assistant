"""Router for generating AI-powered fixes for context check issues."""

import json
import logging

from fastapi import APIRouter

from app.models.context_check import FixRequest, FixResponse
from app.services.ai_service import json_completion
from app.services.fix_service import build_fix_prompt
from app.services.usage_service import record_usage

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/fix")
async def generate_fix(body: FixRequest) -> FixResponse:
    """Generate a fix for a context check issue.

    Takes a detected issue and the chapter content, then generates
    original and fixed text to resolve the inconsistency.
    """
    logger.info("Generating fix for issue: %s", body.issue.description if hasattr(body.issue, 'description') else 'unknown')
    messages = build_fix_prompt(
        body.issue.model_dump(),
        body.chapter_content,
    )
    result = await json_completion(messages)
    record_usage(body.project_slug, "fix", result)
    data = json.loads(result.content)
    logger.info("Fix generated successfully")
    return FixResponse(original=data.get("original", ""), fixed=data.get("fixed", ""))
