"""Service for building idea generation prompts."""

import json
import logging

from app.models.idea import BibleIdeaRequest, ChapterIdeaRequest, IdeaRequest
from app.prompts.ideate_system import (
    PROPOSE_SYSTEM_PROMPT,
    STORY_BIBLE_PROPOSE_PROMPT,
    CHAPTER_PROPOSAL_TYPES,
    STORY_BIBLE_PROPOSAL_TYPES,
)
from app.services.search_service import web_search
from app.services.storage import read_json, story_bible_path

logger = logging.getLogger(__name__)


def build_ideate_messages(body: IdeaRequest) -> list[dict]:
    """Build AI messages for idea generation.

    Handles both chapter and bible idea requests based on
    the discriminated union type.
    """
    bible_path = story_bible_path(body.project_slug) / "story_bible.json"
    bible_data = read_json(bible_path, {
        "characters": [], "events": [], "environment": [], "objects": [],
    })
    story_bible_text = json.dumps(bible_data, indent=2)

    # Web search for fetch_info type
    search_context = ""
    if body.idea_type == "fetch_info":
        logger.info("Performing web search for fetch_info idea")
        search_results = web_search(body.instruction)
        search_context = f"## Web Search Results\n{search_results}"

    if isinstance(body, BibleIdeaRequest):
        type_dict = STORY_BIBLE_PROPOSAL_TYPES
        proposal_type_instruction = type_dict.get(
            body.idea_type, type_dict["rewrite"]
        )
        target_entry = body.target_entry or ""
        system_prompt = STORY_BIBLE_PROPOSE_PROMPT.format(
            story_bible=story_bible_text,
            target_entry=target_entry,
            instruction=body.instruction,
            proposal_type_instruction=proposal_type_instruction,
            search_context=search_context,
        )
    else:
        assert isinstance(body, ChapterIdeaRequest)
        type_dict = CHAPTER_PROPOSAL_TYPES
        proposal_type_instruction = type_dict.get(
            body.idea_type, type_dict["rewrite"]
        )
        selected_section = ""
        if body.selected_text:
            selected_section = (
                f'## Selected Text\n'
                f'The user has selected this specific text to be edited:\n'
                f'"{body.selected_text}"'
            )
        system_prompt = PROPOSE_SYSTEM_PROMPT.format(
            story_bible=story_bible_text,
            chapter_content=body.chapter_content,
            instruction=body.instruction,
            selected_text_section=selected_section,
            proposal_type_instruction=proposal_type_instruction,
            search_context=search_context,
        )

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": body.instruction},
    ]
