"""Router for generating AI-powered text edit proposals."""

import json
import logging

from fastapi import APIRouter
from pydantic import BaseModel

from app.prompts.propose_system import (
    PROPOSE_SYSTEM_PROMPT,
    STORY_BIBLE_PROPOSE_PROMPT,
    CHAPTER_PROPOSAL_TYPES,
    STORY_BIBLE_PROPOSAL_TYPES,
)
from app.services.ai_service import json_completion
from app.services.search_service import web_search
from app.services.storage import story_bible_path, read_json

logger = logging.getLogger(__name__)
router = APIRouter()


class ProposeRequest(BaseModel):
    """Request body for generating a proposal."""
    project_slug: str
    chapter_content: str = ""
    instruction: str
    selected_text: str | None = None
    proposal_type: str = "rewrite"
    context: str = "chapter"  # "chapter" or "story_bible"
    target_entry: str | None = None


class ProposeResponse(BaseModel):
    """Response containing the generated proposal."""
    original: str
    proposed: str
    proposal_type: str


@router.post("/propose")
async def generate_proposal(body: ProposeRequest) -> ProposeResponse:
    """Generate an AI-powered text edit proposal.

    Supports both chapter and story bible contexts, with optional
    web search for 'fetch_info' proposal types.
    """
    logger.info("Generating %s proposal (context=%s) for project %s",
                body.proposal_type, body.context, body.project_slug)

    bible_path = story_bible_path(body.project_slug) / "story_bible.json"
    bible_data = read_json(bible_path, {"characters": [], "events": [], "environment": [], "objects": []})
    story_bible_text = json.dumps(bible_data, indent=2)

    # Web search for fetch_info type
    search_context = ""
    if body.proposal_type == "fetch_info":
        logger.info("Performing web search for fetch_info proposal")
        search_results = web_search(body.instruction)
        search_context = f"## Web Search Results\n{search_results}"

    # Pick type instructions based on context
    type_dict = STORY_BIBLE_PROPOSAL_TYPES if body.context == "story_bible" else CHAPTER_PROPOSAL_TYPES
    proposal_type_instruction = type_dict.get(
        body.proposal_type,
        type_dict.get("rewrite", "Rewrite for clarity and quality."),
    )

    if body.context == "story_bible":
        target_entry = body.target_entry or ""
        system_prompt = STORY_BIBLE_PROPOSE_PROMPT.format(
            story_bible=story_bible_text,
            target_entry=target_entry,
            instruction=body.instruction,
            proposal_type_instruction=proposal_type_instruction,
            search_context=search_context,
        )
    else:
        selected_section = ""
        if body.selected_text:
            selected_section = f'## Selected Text\nThe user has selected this specific text to be edited:\n"{body.selected_text}"'
        system_prompt = PROPOSE_SYSTEM_PROMPT.format(
            story_bible=story_bible_text,
            chapter_content=body.chapter_content,
            instruction=body.instruction,
            selected_text_section=selected_section,
            proposal_type_instruction=proposal_type_instruction,
            search_context=search_context,
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": body.instruction},
    ]

    result = await json_completion(messages)
    data = json.loads(result)
    logger.info("Proposal generated successfully")
    return ProposeResponse(
        original=data.get("original", ""),
        proposed=data.get("proposed", ""),
        proposal_type=body.proposal_type,
    )
