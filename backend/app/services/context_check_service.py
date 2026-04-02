import json

from app.prompts.context_check_system import CONTEXT_CHECK_SYSTEM_PROMPT
from app.services.chat_service import extract_text_from_tiptap
from app.services.storage import (
    chapter_path,
    list_dirs,
    part_path,
    project_path,
    read_json,
    story_bible_path,
)


def gather_previous_chapters(
    project_slug: str, target_part_slug: str, target_chapter_slug: str
) -> str:
    """Gather all chapter content before the target chapter, in order."""
    chapters_text = []
    parts_dir = project_path(project_slug) / "parts"
    part_slugs = list_dirs(parts_dir)

    for ps in part_slugs:
        p_meta = read_json(part_path(project_slug, ps) / "part.json", {})
        chapters_dir = part_path(project_slug, ps) / "chapters"
        chapter_slugs = list_dirs(chapters_dir)

        for cs in chapter_slugs:
            # Stop when we reach the target chapter
            if ps == target_part_slug and cs == target_chapter_slug:
                return "\n\n---\n\n".join(chapters_text) if chapters_text else "(No previous chapters)"

            c_meta = read_json(chapter_path(project_slug, ps, cs) / "chapter.json", {})
            content = read_json(
                chapter_path(project_slug, ps, cs) / "content.json",
                {"type": "doc", "content": []},
            )
            text = extract_text_from_tiptap(content)
            if text.strip():
                title = c_meta.get("title", cs)
                chapters_text.append(f"### {title}\n{text}")

    return "\n\n---\n\n".join(chapters_text) if chapters_text else "(No previous chapters)"


def build_context_check_prompt(
    project_slug: str, part_slug: str, chapter_slug: str
) -> list[dict]:
    # Story bible
    bible_data = read_json(
        story_bible_path(project_slug) / "story_bible.json",
        {"characters": [], "events": [], "environment": [], "objects": []},
    )
    story_bible_text = json.dumps(bible_data, indent=2)

    # Previous chapters
    prev_chapters = gather_previous_chapters(project_slug, part_slug, chapter_slug)

    # Current chapter
    content = read_json(
        chapter_path(project_slug, part_slug, chapter_slug) / "content.json",
        {"type": "doc", "content": []},
    )
    current_text = extract_text_from_tiptap(content)

    system_prompt = CONTEXT_CHECK_SYSTEM_PROMPT.format(
        story_bible=story_bible_text,
        previous_chapters=prev_chapters,
        current_chapter=current_text,
    )

    return [{"role": "system", "content": system_prompt}]
