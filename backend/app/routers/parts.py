from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from slugify import slugify

from app.models.part import Part, PartCreate
from app.services.storage import (
    ensure_dir,
    list_dirs,
    part_path,
    project_path,
    read_json,
    write_json,
)

router = APIRouter()


@router.get("")
async def list_parts(project_slug: str) -> list[Part]:
    parts_dir = project_path(project_slug) / "parts"
    slugs = list_dirs(parts_dir)
    parts = []
    for s in slugs:
        meta = read_json(part_path(project_slug, s) / "part.json")
        if meta:
            parts.append(Part(**meta))
    return sorted(parts, key=lambda p: p.order)


@router.post("", status_code=201)
async def create_part(project_slug: str, body: PartCreate) -> Part:
    slug = slugify(body.title)
    path = part_path(project_slug, slug)
    if path.exists():
        raise HTTPException(400, f"Part '{slug}' already exists")
    ensure_dir(path)
    ensure_dir(path / "chapters")
    # Determine order
    existing = list_dirs(project_path(project_slug) / "parts")
    order = len(existing)
    now = datetime.now(timezone.utc).isoformat()
    meta = {
        "slug": slug,
        "title": body.title,
        "order": order,
        "created_at": now,
    }
    write_json(path / "part.json", meta)
    return Part(**meta)


@router.get("/{part_slug}")
async def get_part(project_slug: str, part_slug: str) -> Part:
    meta = read_json(part_path(project_slug, part_slug) / "part.json")
    if not meta:
        raise HTTPException(404, "Part not found")
    return Part(**meta)
