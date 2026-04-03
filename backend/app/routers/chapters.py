from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from slugify import slugify

from app.models.chapter import ChapterCreate, ChapterFull, ChapterMeta
from app.services.storage import (
    chapter_path,
    ensure_dir,
    list_dirs,
    part_path,
    read_json,
    word_count,
    write_json,
)

router = APIRouter()


@router.get("")
async def list_chapters(project_slug: str, part_slug: str) -> list[ChapterMeta]:
    chapters_dir = part_path(project_slug, part_slug) / "chapters"
    slugs = list_dirs(chapters_dir)
    chapters = []
    for s in slugs:
        meta = read_json(chapter_path(project_slug, part_slug, s) / "chapter.json")
        if meta:
            chapters.append(ChapterMeta(**meta))
    return sorted(chapters, key=lambda c: c.order)


@router.post("", status_code=201)
async def create_chapter(
    project_slug: str, part_slug: str, body: ChapterCreate
) -> ChapterMeta:
    slug = slugify(body.title)
    path = chapter_path(project_slug, part_slug, slug)
    if path.exists():
        raise HTTPException(400, f"Chapter '{slug}' already exists")
    ensure_dir(path)
    # Determine order
    existing = list_dirs(part_path(project_slug, part_slug) / "chapters")
    order = len(existing)
    now = datetime.now(timezone.utc).isoformat()
    meta = {
        "slug": slug,
        "title": body.title,
        "part_slug": part_slug,
        "order": order,
        "word_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    write_json(path / "chapter.json", meta)
    # Empty Tiptap document
    empty_doc: dict[str, Any] = {
        "type": "doc",
        "content": [{"type": "paragraph"}],
    }
    write_json(path / "content.json", empty_doc)
    write_json(path / "chat_history.json", {"messages": []})
    write_json(path / "ideas.json", [])
    return ChapterMeta(**meta)


@router.get("/{chapter_slug}")
async def get_chapter(
    project_slug: str, part_slug: str, chapter_slug: str
) -> ChapterFull:
    path = chapter_path(project_slug, part_slug, chapter_slug)
    meta = read_json(path / "chapter.json")
    if not meta:
        raise HTTPException(404, "Chapter not found")
    content = read_json(path / "content.json", {"type": "doc", "content": []})
    return ChapterFull(meta=ChapterMeta(**meta), content=content)


@router.put("/{chapter_slug}")
async def update_chapter_content(
    project_slug: str, part_slug: str, chapter_slug: str, body: dict[str, Any]
) -> ChapterMeta:
    path = chapter_path(project_slug, part_slug, chapter_slug)
    meta = read_json(path / "chapter.json")
    if not meta:
        raise HTTPException(404, "Chapter not found")
    write_json(path / "content.json", body)
    meta["word_count"] = word_count(body)
    meta["updated_at"] = datetime.now(timezone.utc).isoformat()
    write_json(path / "chapter.json", meta)
    return ChapterMeta(**meta)
