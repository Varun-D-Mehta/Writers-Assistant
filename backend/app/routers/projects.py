"""Router for managing writing projects."""

import logging
import random
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from slugify import slugify

from app.models.project import Project, ProjectCreate
from app.services.storage import (
    ensure_dir,
    list_dirs,
    project_path,
    projects_root,
    read_json,
    write_json,
)
from app.services.usage_service import get_usage_summary

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def list_projects() -> list[Project]:
    """List all available projects."""
    logger.info("Listing all projects")
    slugs = list_dirs(projects_root())
    projects = []
    for s in slugs:
        meta = read_json(project_path(s) / "project.json")
        if meta:
            projects.append(Project(**meta))
    logger.info("Found %d projects", len(projects))
    return projects


@router.post("", status_code=201)
async def create_project(body: ProjectCreate) -> Project:
    """Create a new writing project with an empty story bible."""
    logger.info("Creating project: %s", body.title)
    slug = slugify(body.title)
    path = project_path(slug)
    if path.exists():
        logger.error("Project already exists: %s", slug)
        raise HTTPException(400, f"Project '{slug}' already exists")
    ensure_dir(path)
    ensure_dir(path / "story-bible")
    ensure_dir(path / "parts")
    now = datetime.now(timezone.utc).isoformat()
    logo = random.choice(["quill", "scroll", "inkwell"])
    meta = {
        "slug": slug,
        "title": body.title,
        "logo": logo,
        "created_at": now,
        "updated_at": now,
    }
    write_json(path / "project.json", meta)
    # Initialize empty story bible
    write_json(path / "story-bible" / "story_bible.json", {
        "characters": [],
        "events": [],
        "environment": [],
        "objects": [],
    })
    logger.info("Project created successfully: %s", slug)
    return Project(**meta)


@router.get("/{project_slug}")
async def get_project(project_slug: str) -> Project:
    """Get metadata for a specific project."""
    logger.info("Getting project: %s", project_slug)
    meta = read_json(project_path(project_slug) / "project.json")
    if not meta:
        logger.error("Project not found: %s", project_slug)
        raise HTTPException(404, "Project not found")
    return Project(**meta)


@router.get("/{project_slug}/usage")
async def get_project_usage(project_slug: str) -> dict:
    """Get AI token usage summary for a project.

    Returns totals, per-feature breakdown, and per-chapter breakdown
    with estimated costs.
    """
    meta = read_json(project_path(project_slug) / "project.json")
    if not meta:
        raise HTTPException(404, "Project not found")
    return get_usage_summary(project_slug)
