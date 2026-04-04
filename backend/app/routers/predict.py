"""Router for AI-powered text prediction (autocomplete)."""

import logging

from fastapi import APIRouter

from app.models.predict import PredictRequest, PredictResponse
from app.services.ai_service import chat_completion
from app.services.predict_service import build_predict_messages
from app.services.usage_service import record_usage

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/predict")
async def predict(body: PredictRequest) -> PredictResponse:
    """Generate a text prediction based on the content before the cursor."""
    logger.info("Generating prediction for project: %s", body.project_slug)

    messages = build_predict_messages(body.project_slug, body.text_before_cursor)
    result = await chat_completion(messages, model="gpt-5.4-mini")
    record_usage(body.project_slug, "predict", result)

    return PredictResponse(prediction=result.content.strip())
