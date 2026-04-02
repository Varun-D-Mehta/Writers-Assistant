import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from app.routers import projects, parts, chapters, story_bible, chat, context_check, fix, proposals, predict, propose
from app.routers import export, import_project

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Writers Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(
    parts.router,
    prefix="/api/projects/{project_slug}/parts",
    tags=["parts"],
)
app.include_router(
    chapters.router,
    prefix="/api/projects/{project_slug}/parts/{part_slug}/chapters",
    tags=["chapters"],
)
app.include_router(
    story_bible.router,
    prefix="/api/projects/{project_slug}/story-bible",
    tags=["story-bible"],
)
app.include_router(
    chat.router,
    prefix="/api/projects/{project_slug}/parts/{part_slug}/chapters/{chapter_slug}/chat",
    tags=["chat"],
)
app.include_router(
    proposals.router,
    prefix="/api/projects/{project_slug}/parts/{part_slug}/chapters/{chapter_slug}/proposals",
    tags=["proposals"],
)
app.include_router(context_check.router, prefix="/api", tags=["context-check"])
app.include_router(predict.router, prefix="/api", tags=["predict"])
app.include_router(fix.router, prefix="/api", tags=["fix"])
app.include_router(propose.router, prefix="/api", tags=["propose"])
app.include_router(export.router, prefix="/api", tags=["export"])
app.include_router(import_project.router, prefix="/api", tags=["import"])


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}
