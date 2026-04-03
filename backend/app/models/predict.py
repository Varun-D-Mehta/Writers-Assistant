from pydantic import BaseModel


class PredictRequest(BaseModel):
    """Request body for text prediction."""
    project_slug: str
    text_before_cursor: str


class PredictResponse(BaseModel):
    """Response containing the predicted text continuation."""
    prediction: str
