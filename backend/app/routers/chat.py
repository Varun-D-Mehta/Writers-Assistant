"""Router for chapter-level chat with the AI writing assistant."""

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas.chat import ChatRequest
from app.services.ai_service import chat_stream
from app.services.chat_service import (
    build_chat_messages,
    extract_proposals_from_response,
    load_chat_history,
    save_chat_history,
)
from app.services.storage import chapter_path, write_json

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def get_chat_history(
    project_slug: str, part_slug: str, chapter_slug: str
) -> dict:
    """Retrieve the chat history for a specific chapter."""
    logger.info("Getting chat history for %s/%s/%s", project_slug, part_slug, chapter_slug)
    messages = load_chat_history(project_slug, part_slug, chapter_slug)
    return {"messages": messages}


@router.post("")
async def send_chat_message(
    project_slug: str, part_slug: str, chapter_slug: str, body: ChatRequest
):
    """Send a message to the AI assistant and stream the response.

    Builds context from the chapter content and story bible,
    streams the AI response, extracts any proposals, and saves
    the conversation to history.
    """
    logger.info("Chat message received for %s/%s/%s", project_slug, part_slug, chapter_slug)
    messages = build_chat_messages(
        project_slug,
        part_slug,
        chapter_slug,
        body.message,
        body.chapter_content,
    )

    async def stream():
        full_response = ""
        async for token in chat_stream(messages):
            full_response += token
            yield f"data: {json.dumps({'token': token})}\n\n"

        # Extract proposals from the response
        clean_text, proposals = extract_proposals_from_response(full_response)

        # Save both user message and assistant response to history
        now = datetime.now(timezone.utc).isoformat()
        history = load_chat_history(project_slug, part_slug, chapter_slug)
        history.append({
            "id": str(uuid.uuid4()),
            "role": "user",
            "content": body.message,
            "created_at": now,
        })
        history.append({
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": clean_text,
            "created_at": now,
        })
        save_chat_history(project_slug, part_slug, chapter_slug, history)
        logger.info("Chat response completed and saved for %s/%s/%s", project_slug, part_slug, chapter_slug)

        yield f"data: {json.dumps({'done': True, 'full_response': clean_text, 'proposals': proposals})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.delete("")
async def clear_chat(project_slug: str, part_slug: str, chapter_slug: str):
    """Clear the chat history for a specific chapter."""
    logger.info("Clearing chat history for %s/%s/%s", project_slug, part_slug, chapter_slug)
    path = chapter_path(project_slug, part_slug, chapter_slug) / "chat_history.json"
    write_json(path, {"messages": []})
    return {"ok": True}
