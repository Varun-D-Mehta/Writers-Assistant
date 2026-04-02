"""Router for story bible management and story bible chat."""

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.prompts.story_bible_chat_system import STORY_BIBLE_CHAT_PROMPT
from app.prompts.story_bible_context_check_system import STORY_BIBLE_CHECK_PROMPT
from app.schemas.story_bible import StoryBible
from app.services.ai_service import chat_stream, json_completion
from app.services.storage import read_json, story_bible_path, write_json

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def get_story_bible(project_slug: str) -> StoryBible:
    """Retrieve the story bible for a project."""
    logger.info("Getting story bible for project: %s", project_slug)
    path = story_bible_path(project_slug) / "story_bible.json"
    data = read_json(path)
    if not data:
        logger.error("Story bible not found for project: %s", project_slug)
        raise HTTPException(404, "Story bible not found")
    return StoryBible(**data)


@router.put("")
async def update_story_bible(project_slug: str, body: StoryBible) -> StoryBible:
    """Update the story bible for a project."""
    logger.info("Updating story bible for project: %s", project_slug)
    path = story_bible_path(project_slug) / "story_bible.json"
    write_json(path, body.model_dump())
    return body


# ── Story Bible Chat ──────────────────────────────────────────────


class StoryBibleChatRequest(BaseModel):
    """Request body for story bible chat messages."""
    message: str


def _load_bible_chat_history(project_slug: str) -> list[dict]:
    """Load chat history for the story bible.

    Args:
        project_slug: The project identifier.

    Returns:
        List of message dicts from the chat history.
    """
    path = story_bible_path(project_slug) / "chat_history.json"
    data = read_json(path, {"messages": []})
    return data.get("messages", [])


def _save_bible_chat_history(project_slug: str, messages: list[dict]) -> None:
    """Save chat history for the story bible.

    Args:
        project_slug: The project identifier.
        messages: List of message dicts to save.
    """
    path = story_bible_path(project_slug) / "chat_history.json"
    write_json(path, {"messages": messages})


@router.get("/chat")
async def get_bible_chat_history(project_slug: str) -> dict:
    """Retrieve the story bible chat history."""
    logger.info("Getting story bible chat history for project: %s", project_slug)
    messages = _load_bible_chat_history(project_slug)
    return {"messages": messages}


@router.post("/chat")
async def send_bible_chat_message(project_slug: str, body: StoryBibleChatRequest):
    """Send a message to the story bible AI assistant and stream the response."""
    logger.info("Story bible chat message received for project: %s", project_slug)
    # Load story bible
    bible_path = story_bible_path(project_slug) / "story_bible.json"
    bible_data = read_json(bible_path, {"characters": [], "events": [], "environment": [], "objects": []})
    story_bible_text = json.dumps(bible_data, indent=2)

    system_prompt = STORY_BIBLE_CHAT_PROMPT.format(story_bible=story_bible_text)

    history = _load_bible_chat_history(project_slug)
    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": body.message})

    async def stream():
        full_response = ""
        async for token in chat_stream(messages):
            full_response += token
            yield f"data: {json.dumps({'token': token})}\n\n"

        now = datetime.now(timezone.utc).isoformat()
        history.append({
            "id": str(uuid.uuid4()),
            "role": "user",
            "content": body.message,
            "created_at": now,
        })
        history.append({
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": full_response,
            "created_at": now,
        })
        _save_bible_chat_history(project_slug, history)
        logger.info("Story bible chat response completed for project: %s", project_slug)

        yield f"data: {json.dumps({'done': True, 'full_response': full_response})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.delete("/chat")
async def clear_bible_chat(project_slug: str):
    """Clear the story bible chat history."""
    logger.info("Clearing story bible chat history for project: %s", project_slug)
    path = story_bible_path(project_slug) / "chat_history.json"
    write_json(path, {"messages": []})
    return {"ok": True}


# ── Story Bible Proposals ──────────────────────────────────────


SECTION_SCHEMAS = {
    "characters": '{"name": "", "description": "", "traits": [""], "notes": ""}',
    "events": '{"name": "", "description": "", "chapter_refs": [""]}',
    "environment": '{"name": "", "description": "", "details": {}}',
    "objects": '{"name": "", "description": "", "significance": "", "notes": ""}',
}

BIBLE_PROPOSE_TYPES = {
    "rewrite": "Rewrite for clarity, depth, and consistency.",
    "expand": "Expand with additional details, backstory, or connections.",
    "fix_typo": "Fix spelling, grammar, and punctuation only.",
    "add_detail": "Add specific details like descriptions, motivations, or history.",
    "fetch_info": "Incorporate real-world research to ground the element in reality.",
    "consistency": "Fix consistency issues with other story bible entries.",
}

BIBLE_PROPOSE_PROMPT = """You are a story bible editor for a creative writing project.

## Full Story Bible
{story_bible}

## Section Type: {section_type}
## Current Entry (index {entry_index})
{current_entry}

## Task: {proposal_type_instruction}
## User Instruction: {instruction}

{search_context}

Return ONLY a JSON object with the COMPLETE updated entry matching this schema:
{entry_schema}

Rules:
- Return the FULL entry with ALL fields populated
- Apply the requested changes while keeping unchanged fields intact
- Maintain consistency with the rest of the story bible
- If search results are provided, incorporate relevant details naturally
"""


class BibleProposeRequest(BaseModel):
    """Request body for story bible entry proposals."""
    section: str  # characters, events, environment, objects
    entry_index: int
    instruction: str
    proposal_type: str = "rewrite"


class BibleProposeResponse(BaseModel):
    """Response containing the proposed entry update."""
    section: str
    entry_index: int
    current_entry: dict
    proposed_entry: dict
    proposal_type: str


@router.post("/propose")
async def propose_bible_entry(project_slug: str, body: BibleProposeRequest) -> BibleProposeResponse:
    """Generate a structured proposal for a story bible entry.

    Returns the complete updated entry object that can be directly
    applied to replace the existing entry.
    """
    logger.info("Generating %s proposal for %s[%d] in project %s",
                body.proposal_type, body.section, body.entry_index, project_slug)

    bible_file = story_bible_path(project_slug) / "story_bible.json"
    bible_data = read_json(bible_file, {"characters": [], "events": [], "environment": [], "objects": []})
    story_bible_text = json.dumps(bible_data, indent=2)

    entries = bible_data.get(body.section, [])
    if body.entry_index < 0 or body.entry_index >= len(entries):
        from fastapi import HTTPException
        raise HTTPException(400, f"Invalid entry index {body.entry_index} for section {body.section}")

    current_entry = entries[body.entry_index]
    entry_schema = SECTION_SCHEMAS.get(body.section, "{}")

    type_instruction = BIBLE_PROPOSE_TYPES.get(body.proposal_type, BIBLE_PROPOSE_TYPES["rewrite"])

    # Web search for fetch_info
    search_context = ""
    if body.proposal_type == "fetch_info":
        from app.services.search_service import web_search
        search_results = web_search(body.instruction)
        search_context = f"## Web Search Results\n{search_results}"

    prompt = BIBLE_PROPOSE_PROMPT.format(
        story_bible=story_bible_text,
        section_type=body.section,
        entry_index=body.entry_index,
        current_entry=json.dumps(current_entry, indent=2),
        proposal_type_instruction=type_instruction,
        instruction=body.instruction,
        search_context=search_context,
        entry_schema=entry_schema,
    )

    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": body.instruction},
    ]

    result = await json_completion(messages)
    proposed = json.loads(result)

    logger.info("Story bible proposal generated for %s[%d]", body.section, body.entry_index)
    return BibleProposeResponse(
        section=body.section,
        entry_index=body.entry_index,
        current_entry=current_entry,
        proposed_entry=proposed,
        proposal_type=body.proposal_type,
    )


# ── Story Bible Context Check ───────────────────────────────────


@router.post("/context-check")
async def story_bible_context_check(project_slug: str) -> dict:
    """Run a consistency check on the story bible entries."""
    logger.info("Running story bible context check for project: %s", project_slug)
    bible_path = story_bible_path(project_slug) / "story_bible.json"
    bible_data = read_json(bible_path, {"characters": [], "events": [], "environment": [], "objects": []})
    story_bible_text = json.dumps(bible_data, indent=2)

    system_prompt = STORY_BIBLE_CHECK_PROMPT.format(story_bible=story_bible_text)

    messages = [{"role": "system", "content": system_prompt}]
    result = await json_completion(messages)
    data = json.loads(result)
    logger.info("Story bible context check completed for project: %s", project_slug)
    return data
