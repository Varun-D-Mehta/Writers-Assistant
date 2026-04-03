"""Service for story bible chat, ideas, and context checks."""

import json
import logging

from app.prompts.story_bible_chat_system import STORY_BIBLE_CHAT_PROMPT
from app.prompts.story_bible_context_check_system import STORY_BIBLE_CHECK_PROMPT
from app.prompts.story_bible_ideate_system import (
    BIBLE_PROPOSE_PROMPT,
    BIBLE_PROPOSE_TYPES,
    SECTION_SCHEMAS,
)
from app.services.search_service import web_search
from app.services.storage import read_json, story_bible_path, write_json

logger = logging.getLogger(__name__)


# ── Chat history ──────────────────────────────────────────────────


def load_bible_chat_history(project_slug: str) -> list[dict]:
    """Load chat history for the story bible."""
    path = story_bible_path(project_slug) / "chat_history.json"
    data = read_json(path, {"messages": []})
    return data.get("messages", [])


def save_bible_chat_history(project_slug: str, messages: list[dict]) -> None:
    """Save chat history for the story bible."""
    path = story_bible_path(project_slug) / "chat_history.json"
    write_json(path, {"messages": messages})


def build_bible_chat_messages(
    project_slug: str, user_message: str
) -> tuple[list[dict], list[dict]]:
    """Build messages for story bible chat completion.

    Returns (messages_for_ai, current_history) so the router can
    save history after streaming completes.
    """
    bible_path = story_bible_path(project_slug) / "story_bible.json"
    bible_data = read_json(bible_path, {
        "characters": [], "events": [], "environment": [], "objects": [],
    })
    story_bible_text = json.dumps(bible_data, indent=2)
    system_prompt = STORY_BIBLE_CHAT_PROMPT.format(story_bible=story_bible_text)

    history = load_bible_chat_history(project_slug)
    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})

    return messages, history


# ── Idea generation ───────────────────────────────────────────


def build_bible_ideate_messages(
    project_slug: str,
    section: str,
    entry_index: int,
    instruction: str,
    idea_type: str = "rewrite",
) -> tuple[list[dict], dict]:
    """Build messages for story bible idea generation.

    Returns (messages_for_ai, current_entry).
    Raises ValueError if entry_index is invalid.
    """
    bible_file = story_bible_path(project_slug) / "story_bible.json"
    bible_data = read_json(bible_file, {
        "characters": [], "events": [], "environment": [], "objects": [],
    })
    story_bible_text = json.dumps(bible_data, indent=2)

    entries = bible_data.get(section, [])
    if entry_index < 0 or entry_index >= len(entries):
        raise ValueError(f"Invalid entry index {entry_index} for section {section}")

    current_entry = entries[entry_index]
    entry_schema = SECTION_SCHEMAS.get(section, "{}")
    type_instruction = BIBLE_PROPOSE_TYPES.get(
        idea_type, BIBLE_PROPOSE_TYPES["rewrite"]
    )

    search_context = ""
    if idea_type == "fetch_info":
        search_results = web_search(instruction)
        search_context = f"## Web Search Results\n{search_results}"

    prompt = BIBLE_PROPOSE_PROMPT.format(
        story_bible=story_bible_text,
        section_type=section,
        entry_index=entry_index,
        current_entry=json.dumps(current_entry, indent=2),
        proposal_type_instruction=type_instruction,
        instruction=instruction,
        search_context=search_context,
        entry_schema=entry_schema,
    )

    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": instruction},
    ]
    return messages, current_entry


# ── Context check ─────────────────────────────────────────────────


def build_bible_context_check_messages(project_slug: str) -> list[dict]:
    """Build messages for story bible consistency check."""
    bible_path = story_bible_path(project_slug) / "story_bible.json"
    bible_data = read_json(bible_path, {
        "characters": [], "events": [], "environment": [], "objects": [],
    })
    story_bible_text = json.dumps(bible_data, indent=2)
    system_prompt = STORY_BIBLE_CHECK_PROMPT.format(story_bible=story_bible_text)
    return [{"role": "system", "content": system_prompt}]
