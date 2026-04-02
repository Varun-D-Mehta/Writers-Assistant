"""Router for AI-powered text prediction (autocomplete)."""

import json
import logging

from fastapi import APIRouter
from pydantic import BaseModel

from app.prompts.predict_system import PREDICT_SYSTEM_PROMPT
from app.services.ai_service import chat_completion
from app.services.storage import story_bible_path, read_json

logger = logging.getLogger(__name__)
router = APIRouter()


class PredictRequest(BaseModel):
    """Request body for text prediction."""
    project_slug: str
    text_before_cursor: str


class PredictResponse(BaseModel):
    """Response containing the predicted text continuation."""
    prediction: str


@router.post("/predict")
async def predict(body: PredictRequest) -> PredictResponse:
    """Generate a text prediction based on the content before the cursor.

    Uses the story bible for context and the last ~2000 characters
    of text to generate a continuation.
    """
    logger.info("Generating prediction for project: %s", body.project_slug)
    # Load story bible for context
    bible_path = story_bible_path(body.project_slug) / "story_bible.json"
    bible_data = read_json(bible_path, {"characters": [], "events": [], "environment": [], "objects": []})
    story_bible_text = json.dumps(bible_data, indent=2)

    system_prompt = PREDICT_SYSTEM_PROMPT.format(story_bible=story_bible_text)

    # Use only the last ~2000 chars for context to keep it fast
    context = body.text_before_cursor[-2000:]

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": context},
    ]

    prediction = await chat_completion(messages, model="gpt-4o-mini")
    logger.info("Prediction generated successfully for project: %s", body.project_slug)
    return PredictResponse(prediction=prediction.strip())
