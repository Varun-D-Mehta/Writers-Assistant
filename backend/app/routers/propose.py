"""Router for generating AI-powered text edit proposals."""

import json
import logging

from fastapi import APIRouter

from app.models.proposal import (
    BibleProposeRequest,
    BibleProposeResponse,
    ChapterProposeResponse,
    ProposeRequest,
    ProposeResponse,
)
from app.services.ai_service import json_completion
from app.services.propose_service import build_propose_messages
from app.services.usage_service import record_usage

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/propose")
async def generate_proposal(body: ProposeRequest) -> ProposeResponse:
    """Generate an AI-powered text edit proposal.

    Accepts either a ChapterProposeRequest or BibleProposeRequest
    (discriminated on the 'kind' field) and returns the matching response type.
    """
    logger.info("Generating %s proposal (kind=%s) for project %s",
                body.proposal_type, body.kind, body.project_slug)

    messages = build_propose_messages(body)
    result = await json_completion(messages)
    record_usage(body.project_slug, "propose", result)
    data = json.loads(result.content)

    if isinstance(body, BibleProposeRequest):
        return BibleProposeResponse(
            section=body.section,
            entry_index=body.entry_index,
            current_entry=data.get("current_entry", {}),
            proposed_entry=data.get("proposed_entry", data),
            proposal_type=body.proposal_type,
        )
    else:
        return ChapterProposeResponse(
            original=data.get("original", ""),
            proposed=data.get("proposed", ""),
            proposal_type=body.proposal_type,
        )
