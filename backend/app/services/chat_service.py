"""Chat service for building chat messages and managing chat history."""

import json
import logging
import re

from app.prompts.chat_system import CHAT_SYSTEM_PROMPT
from app.services.storage import (
    chapter_path,
    read_json,
    story_bible_path,
    write_json,
)

logger = logging.getLogger(__name__)


def extract_proposals_from_response(text: str) -> tuple[str, list[dict]]:
    """Extract and strip the json:proposals block from a chat response.

    Args:
        text: The raw chat response text.

    Returns:
        A tuple of (clean_text, proposals_list).
    """
    pattern = r'```json:proposals\s*\n(.*?)\n```'
    match = re.search(pattern, text, re.DOTALL)
    if not match:
        return text.strip(), []
    try:
        proposals = json.loads(match.group(1))
        logger.info("Extracted %d proposals from chat response", len(proposals))
    except json.JSONDecodeError:
        logger.error("Failed to parse proposals JSON from chat response")
        return text.strip(), []
    clean_text = text[:match.start()].strip()
    return clean_text, proposals


def extract_text_from_tiptap(node: dict) -> str:
    """Extract plain text from a Tiptap JSON document.

    Args:
        node: A Tiptap document node dict.

    Returns:
        Plain text content extracted from the document.
    """
    text = ""
    if node.get("type") == "text":
        text += node.get("text", "")
    for child in node.get("content", []):
        text += extract_text_from_tiptap(child)
        if child.get("type") in ("paragraph", "heading"):
            text += "\n"
    return text


def load_chat_history(project_slug: str, part_slug: str, chapter_slug: str) -> list[dict]:
    """Load chat history for a specific chapter.

    Args:
        project_slug: The project identifier.
        part_slug: The part identifier.
        chapter_slug: The chapter identifier.

    Returns:
        List of message dicts from the chat history.
    """
    path = chapter_path(project_slug, part_slug, chapter_slug) / "chat_history.json"
    data = read_json(path, {"messages": []})
    logger.info("Loaded %d chat messages for %s/%s/%s", len(data.get("messages", [])), project_slug, part_slug, chapter_slug)
    return data.get("messages", [])


def save_chat_history(
    project_slug: str, part_slug: str, chapter_slug: str, messages: list[dict]
) -> None:
    """Save chat history for a specific chapter.

    Args:
        project_slug: The project identifier.
        part_slug: The part identifier.
        chapter_slug: The chapter identifier.
        messages: List of message dicts to save.
    """
    path = chapter_path(project_slug, part_slug, chapter_slug) / "chat_history.json"
    write_json(path, {"messages": messages})
    logger.info("Saved %d chat messages for %s/%s/%s", len(messages), project_slug, part_slug, chapter_slug)


def build_chat_messages(
    project_slug: str,
    part_slug: str,
    chapter_slug: str,
    user_message: str,
    chapter_content: dict | None = None,
) -> list[dict]:
    """Build the full message list for a chat completion request.

    Args:
        project_slug: The project identifier.
        part_slug: The part identifier.
        chapter_slug: The chapter identifier.
        user_message: The user's new message.
        chapter_content: Optional Tiptap JSON content for the chapter.

    Returns:
        List of message dicts ready for the AI service.
    """
    logger.info("Building chat messages for %s/%s/%s", project_slug, part_slug, chapter_slug)

    # Load story bible
    bible_path = story_bible_path(project_slug) / "story_bible.json"
    bible_data = read_json(bible_path, {"characters": [], "events": [], "environment": [], "objects": []})
    story_bible_text = json.dumps(bible_data, indent=2)

    # Get chapter content as plain text
    if chapter_content:
        chapter_text = extract_text_from_tiptap(chapter_content)
    else:
        content_path = chapter_path(project_slug, part_slug, chapter_slug) / "content.json"
        content_data = read_json(content_path, {"type": "doc", "content": []})
        chapter_text = extract_text_from_tiptap(content_data)

    # Build system prompt
    system_prompt = CHAT_SYSTEM_PROMPT.format(
        story_bible=story_bible_text,
        chapter_content=chapter_text,
    )

    # Load chat history
    history = load_chat_history(project_slug, part_slug, chapter_slug)

    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})

    return messages
