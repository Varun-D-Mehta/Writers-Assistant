"""Router for story bible management and story bible chat."""

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.idea import (
    BibleIdea,
    BibleIdeaCreate,
    BibleIdeaRequestBody,
    BibleIdeaResponse,
    IdeaStatusUpdate,
)
from app.models.story_bible import StoryBible, StoryBibleChatRequest
from app.services.ai_service import StreamUsage, chat_stream, json_completion
from app.services.storage import read_json, story_bible_path, write_json
from app.services.story_bible_service import (
    build_bible_chat_messages,
    build_bible_context_check_messages,
    build_bible_ideate_messages,
    load_bible_chat_history,
    save_bible_chat_history,
)
from app.services.usage_service import record_usage

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def get_story_bible(project_slug: str) -> StoryBible:
    """Retrieve the story bible for a project."""
    logger.info("Getting story bible for project: %s", project_slug)
    path = story_bible_path(project_slug) / "story_bible.json"
    data = read_json(path)
    if not data:
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


@router.get("/chat")
async def get_bible_chat_history(project_slug: str) -> dict:
    """Retrieve the story bible chat history."""
    messages = load_bible_chat_history(project_slug)
    return {"messages": messages}


@router.post("/chat")
async def send_bible_chat_message(project_slug: str, body: StoryBibleChatRequest):
    """Send a message to the story bible AI assistant and stream the response."""
    logger.info("Story bible chat message received for project: %s", project_slug)
    messages, history = build_bible_chat_messages(project_slug, body.message)

    async def stream():
        full_response = ""
        async for chunk in chat_stream(messages):
            if isinstance(chunk, StreamUsage):
                record_usage(project_slug, "bible_chat", chunk)
            else:
                full_response += chunk
                yield f"data: {json.dumps({'token': chunk})}\n\n"

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
        save_bible_chat_history(project_slug, history)
        logger.info("Story bible chat response completed for project: %s", project_slug)

        yield f"data: {json.dumps({'done': True, 'full_response': full_response})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.delete("/chat")
async def clear_bible_chat(project_slug: str):
    """Clear the story bible chat history."""
    path = story_bible_path(project_slug) / "chat_history.json"
    write_json(path, {"messages": []})
    return {"ok": True}


# ── Story Bible Ideas ──────────────────────────────────────


@router.post("/ideate")
async def ideate_bible_entry(project_slug: str, body: BibleIdeaRequestBody) -> BibleIdeaResponse:
    """Generate a structured idea for a story bible entry."""
    logger.info("Generating %s idea for %s[%d] in project %s",
                body.idea_type, body.section, body.entry_index, project_slug)

    try:
        messages, current_entry = build_bible_ideate_messages(
            project_slug, body.section, body.entry_index,
            body.instruction, body.idea_type,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    result = await json_completion(messages)
    record_usage(project_slug, "bible_ideate", result)
    ideated = json.loads(result.content)

    return BibleIdeaResponse(
        section=body.section,
        entry_index=body.entry_index,
        current_entry=current_entry,
        proposed_entry=ideated,
        idea_type=body.idea_type,
    )


# ── Story Bible Idea Persistence ──────────────────────────


def _bible_ideas_path(project_slug: str):
    return story_bible_path(project_slug) / "ideas.json"


@router.get("/ideas")
async def list_bible_ideas(project_slug: str) -> list[BibleIdea]:
    """List all story bible ideas for a project."""
    data = read_json(_bible_ideas_path(project_slug), [])
    for p in data:
        p.setdefault("kind", "bible")
    return [BibleIdea(**p) for p in data]


@router.post("/ideas", status_code=201)
async def create_bible_idea(project_slug: str, body: BibleIdeaCreate) -> BibleIdea:
    """Persist a story bible idea."""
    path = _bible_ideas_path(project_slug)
    data = read_json(path, [])
    idea = BibleIdea(
        id=str(uuid.uuid4()),
        kind="bible",
        section=body.section,
        entry_index=body.entry_index,
        current_entry=body.current_entry,
        proposed_entry=body.proposed_entry,
        idea_type=body.idea_type,
        source_label=body.source_label,
        status="pending",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    data.append(idea.model_dump())
    write_json(path, data)
    return idea


@router.patch("/ideas/{idea_id}")
async def update_bible_idea_status(
    project_slug: str, idea_id: str, body: IdeaStatusUpdate
) -> BibleIdea:
    """Update a story bible idea's status to accepted or declined."""
    path = _bible_ideas_path(project_slug)
    data = read_json(path, [])
    for p in data:
        if p["id"] == idea_id:
            p["status"] = body.status
            p.setdefault("kind", "bible")
            write_json(path, data)
            return BibleIdea(**p)
    raise HTTPException(404, f"Idea {idea_id} not found")


# ── Story Bible Context Check ───────────────────────────────────


@router.post("/context-check")
async def story_bible_context_check(project_slug: str) -> dict:
    """Run a consistency check on the story bible entries."""
    logger.info("Running story bible context check for project: %s", project_slug)
    messages = build_bible_context_check_messages(project_slug)
    result = await json_completion(messages)
    record_usage(project_slug, "bible_context_check", result)
    data = json.loads(result.content)
    return data
