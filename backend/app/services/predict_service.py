"""Service for building text prediction context."""

import json
import logging

from app.prompts.predict_system import PREDICT_SYSTEM_PROMPT
from app.services.storage import read_json, story_bible_path

logger = logging.getLogger(__name__)


def build_predict_messages(
    project_slug: str, text_before_cursor: str, context_chars: int = 2000
) -> list[dict]:
    """Build AI messages for text prediction.

    Args:
        project_slug: The project identifier.
        text_before_cursor: Full text before the cursor position.
        context_chars: Max characters of context to send (default 2000).

    Returns:
        Messages list ready for the AI service.
    """
    bible_path = story_bible_path(project_slug) / "story_bible.json"
    bible_data = read_json(bible_path, {
        "characters": [], "events": [], "environment": [], "objects": [],
    })
    story_bible_text = json.dumps(bible_data, indent=2)
    system_prompt = PREDICT_SYSTEM_PROMPT.format(story_bible=story_bible_text)

    context = text_before_cursor[-context_chars:]
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": context},
    ]
