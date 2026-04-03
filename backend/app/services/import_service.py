"""Service for importing projects from Writers Assistant export files.

Only files exported by Writers Assistant (TXT or PDF) can be imported.
The structured markers ([STORY BIBLE], [CHARACTERS], [MANUSCRIPT], etc.)
are parsed with regex — no LLM is involved.
"""

import logging
import random
import re
from datetime import datetime, timezone
from io import BytesIO

import pdfplumber
from slugify import slugify

from app.services.storage import ensure_dir, project_path, write_json

logger = logging.getLogger(__name__)

# Marker that proves this file was exported by Writers Assistant
EXPORT_HEADER = "Writers Assistant Export"


def extract_pdf_text(content: bytes) -> str:
    """Extract ALL plain text from PDF bytes, stripping PDF artifacts.

    Removes page headers (repeated project title), footers (Page X/Y),
    and normalizes whitespace so the structured markers can be parsed.

    Returns:
        Full extracted text, or empty string if extraction fails.
    """
    text = ""
    with pdfplumber.open(BytesIO(content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n\n"

    if not text.strip():
        logger.warning("No extractable text found — PDF may be image-based")
        return ""

    # Strip PDF artifacts: page numbers and repeated headers
    text = _clean_pdf_text(text)

    logger.info("Extracted %d characters from PDF", len(text))
    return text


def _clean_pdf_text(text: str) -> str:
    """Remove PDF header/footer artifacts from extracted text."""
    # Remove "Page X/Y" footers
    text = re.sub(r"^Page \d+/\d+\s*$", "", text, flags=re.MULTILINE)

    # Detect the project title from the header block (first non-empty line)
    lines = text.strip().split("\n")
    title = ""
    for line in lines:
        stripped = line.strip()
        if stripped and stripped != "=" * len(stripped):
            title = stripped
            break

    # Remove repeated title lines that appear as PDF page headers
    # (the title appears at the top of every page after the first)
    if title:
        cleaned_lines = []
        header_block_done = False
        for line in text.split("\n"):
            stripped = line.strip()
            # Keep the title in the original header block (before [STORY BIBLE])
            if not header_block_done:
                cleaned_lines.append(line)
                if "[STORY BIBLE]" in stripped or "[MANUSCRIPT]" in stripped:
                    header_block_done = True
            else:
                # After header block, remove standalone title lines (PDF headers)
                if stripped == title:
                    continue
                cleaned_lines.append(line)
        text = "\n".join(cleaned_lines)

    # Collapse multiple blank lines into at most two
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def validate_export_file(text: str) -> bool:
    """Check if this text was exported by Writers Assistant."""
    return EXPORT_HEADER in text[:500]


def parse_export_text(text: str) -> dict:
    """Parse a Writers Assistant export file into structured project data.

    Uses regex to split on the structured markers written by the export service.
    No LLM involved — this is pure text parsing.

    Raises:
        ValueError: If the file is not a valid Writers Assistant export.
    """
    if not validate_export_file(text):
        raise ValueError(
            "This file was not exported by Writers Assistant. "
            "Only files created with Export TXT or Export PDF can be imported."
        )

    # Extract project title from the header block
    # TXT format: "====\n  Title\n  Writers Assistant Export\n===="
    # PDF format: "Title\nTitle\nWriters Assistant Export" (no ====, title may repeat)
    title_match = re.search(r"={10,}\n\s*(.+?)\n\s*Writers Assistant Export", text)
    if not title_match:
        # PDF fallback: title is the line right before "Writers Assistant Export"
        title_match = re.search(r"^(.+?)\n\s*Writers Assistant Export", text, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else "Imported Project"

    data: dict = {
        "title": title,
        "metadata": {},
        "characters": [],
        "events": [],
        "environment": [],
        "objects": [],
        "parts": [],
    }

    # ── Story Bible parsing ───────────────────────────────────

    bible_match = re.search(r"\[STORY BIBLE\]\s*\n(.*?)(?=\[MANUSCRIPT\]|\Z)", text, re.DOTALL)
    if bible_match:
        bible_text = bible_match.group(1)

        # Overview / Metadata
        overview_match = re.search(r"\[OVERVIEW\]\s*\n(.*?)(?=\[CHARACTERS\]|\[EVENTS\]|\[ENVIRONMENT\]|\[OBJECTS\]|\[MANUSCRIPT\]|\Z)", bible_text, re.DOTALL)
        if overview_match:
            overview = overview_match.group(1)
            field_map = {
                "Title": "title", "Genre": "genre", "Setting": "setting",
                "Time Period": "time_period", "Point of View": "pov",
                "Tone & Style": "tone", "Synopsis": "synopsis",
            }
            for label, key in field_map.items():
                m = re.search(rf"^\s*{re.escape(label)}:\s*(.+)$", overview, re.MULTILINE)
                if m:
                    data["metadata"][key] = m.group(1).strip()

        # Characters
        chars_match = re.search(r"\[CHARACTERS\]\s*\n(.*?)(?=\[EVENTS\]|\[ENVIRONMENT\]|\[OBJECTS\]|\[MANUSCRIPT\]|\Z)", bible_text, re.DOTALL)
        if chars_match:
            char_blocks = re.split(r"^\s*Character:\s*", chars_match.group(1), flags=re.MULTILINE)
            for block in char_blocks:
                block = block.strip()
                if not block:
                    continue
                lines = block.split("\n")
                name = lines[0].strip()
                desc = _extract_field(block, "Description")
                traits_str = _extract_field(block, "Traits")
                traits = [t.strip() for t in traits_str.split(",")] if traits_str else []
                notes = _extract_field(block, "Notes")
                data["characters"].append({
                    "name": name, "description": desc,
                    "traits": traits, "notes": notes,
                })

        # Events
        events_match = re.search(r"\[EVENTS\]\s*\n(.*?)(?=\[ENVIRONMENT\]|\[OBJECTS\]|\[MANUSCRIPT\]|\Z)", bible_text, re.DOTALL)
        if events_match:
            event_blocks = re.split(r"^\s*Event \d+:\s*", events_match.group(1), flags=re.MULTILINE)
            for block in event_blocks:
                block = block.strip()
                if not block:
                    continue
                lines = block.split("\n")
                name = lines[0].strip()
                # Try labeled "Description:" first (new format), fall back to unlabeled lines (old format)
                desc = _extract_field(block, "Description")
                if not desc:
                    desc = "\n".join(l.strip() for l in lines[1:] if l.strip() and not l.strip().startswith("Chapters:"))
                chapters_m = re.search(r"^\s*Chapters:\s*(.+)$", block, re.MULTILINE)
                refs = [r.strip() for r in chapters_m.group(1).split(",")] if chapters_m else []
                data["events"].append({
                    "name": name, "description": desc, "chapter_refs": refs,
                })

        # Environment
        env_match = re.search(r"\[ENVIRONMENT\]\s*\n(.*?)(?=\[OBJECTS\]|\[MANUSCRIPT\]|\Z)", bible_text, re.DOTALL)
        if env_match:
            env_blocks = re.split(r"^\s*Setting:\s*", env_match.group(1), flags=re.MULTILINE)
            for block in env_blocks:
                block = block.strip()
                if not block:
                    continue
                lines = block.split("\n")
                name = lines[0].strip()
                # Try labeled "Description:" first (new format)
                desc = _extract_field(block, "Description")
                details = {}
                if not desc:
                    # Old format: unlabeled description lines followed by key: value details
                    desc_lines = []
                    for line in lines[1:]:
                        stripped = line.strip()
                        if not stripped:
                            continue
                        kv = re.match(r"^(\w[\w\s]*?):\s+(.+)$", stripped)
                        if kv and kv.group(1).strip() not in ("Description",):
                            details[kv.group(1).strip()] = kv.group(2).strip()
                        else:
                            desc_lines.append(stripped)
                    desc = "\n".join(desc_lines)
                else:
                    # New format: details come after the description field
                    in_desc = False
                    for line in lines[1:]:
                        stripped = line.strip()
                        if not stripped:
                            continue
                        if stripped.startswith("Description:"):
                            in_desc = True
                            continue
                        if in_desc:
                            # Check if this is a detail key:value (not a known field)
                            kv = re.match(r"^(\w[\w\s]*?):\s+(.+)$", stripped)
                            if kv and kv.group(1).strip() not in KNOWN_FIELDS:
                                details[kv.group(1).strip()] = kv.group(2).strip()
                data["environment"].append({
                    "name": name,
                    "description": desc,
                    "details": details,
                })

        # Objects
        objs_match = re.search(r"\[OBJECTS\]\s*\n(.*?)(?=\[MANUSCRIPT\]|\Z)", bible_text, re.DOTALL)
        if objs_match:
            obj_blocks = re.split(r"^\s*Object:\s*", objs_match.group(1), flags=re.MULTILINE)
            for block in obj_blocks:
                block = block.strip()
                if not block:
                    continue
                lines = block.split("\n")
                name = lines[0].strip()
                data["objects"].append({
                    "name": name,
                    "description": _extract_field(block, "Description"),
                    "significance": _extract_field(block, "Significance"),
                    "notes": _extract_field(block, "Notes"),
                })

    # ── Manuscript parsing ────────────────────────────────────

    manuscript_match = re.search(r"\[MANUSCRIPT\]\s*\n(.*)", text, re.DOTALL)
    if manuscript_match:
        manuscript_text = manuscript_match.group(1)

        # Split into parts
        part_splits = re.split(r"\[PART:\s*(.+?)\]", manuscript_text)
        # part_splits: ['before', 'Part Title', 'content', 'Part Title 2', 'content2', ...]
        for i in range(1, len(part_splits), 2):
            part_title = part_splits[i].strip()
            part_content = part_splits[i + 1] if i + 1 < len(part_splits) else ""

            # Split into chapters
            chapter_splits = re.split(r"\[CHAPTER:\s*(.+?)\]", part_content)
            chapters = []
            for j in range(1, len(chapter_splits), 2):
                ch_title = chapter_splits[j].strip()
                ch_content = chapter_splits[j + 1] if j + 1 < len(chapter_splits) else ""
                # Clean up: remove trailing --- separators
                ch_content = re.sub(r"\n---\s*$", "", ch_content.strip())
                chapters.append({"title": ch_title, "content": ch_content.strip()})

            data["parts"].append({"title": part_title, "chapters": chapters})

    return data


KNOWN_FIELDS = {"Description", "Traits", "Notes", "Significance", "Chapters"}


def _extract_field(block: str, field_name: str) -> str:
    """Extract a multi-line field value from an indented block of text.

    Grabs the labeled line plus all continuation lines that follow,
    stopping at the next known field label or blank line.
    """
    lines = block.split("\n")
    collecting = False
    result_lines: list[str] = []

    for line in lines:
        stripped = line.strip()

        if not collecting:
            # Look for our field
            m = re.match(rf"^\s*{re.escape(field_name)}:\s*(.*)$", line)
            if m:
                first_val = m.group(1).strip()
                if first_val:
                    result_lines.append(first_val)
                collecting = True
        else:
            # Check if this line starts a new known field
            if any(re.match(rf"^\s*{re.escape(f)}:", stripped) for f in KNOWN_FIELDS if f != field_name):
                break
            # Empty line ends the field
            if not stripped:
                break
            result_lines.append(stripped)

    return "\n".join(result_lines)


def text_to_tiptap(text: str) -> dict:
    """Convert plain text to a Tiptap JSON document.

    Double newlines (\\n\\n) create paragraph breaks.
    Single newlines within a paragraph are joined with a space
    (they're typically PDF line-wrapping artifacts).
    """
    # Split on double-newlines to get true paragraphs
    raw_paragraphs = re.split(r"\n{2,}", text.strip())
    paragraphs = []
    for raw in raw_paragraphs:
        # Join single newlines within a paragraph (PDF wrapping)
        joined = " ".join(line.strip() for line in raw.split("\n") if line.strip())
        if joined:
            paragraphs.append(joined)

    return {
        "type": "doc",
        "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": p}]}
            for p in paragraphs
        ] if paragraphs else [],
    }


def create_project_from_data(data: dict, fallback_title: str = "Imported Project") -> dict:
    """Create the project directory structure from parsed data.

    Returns:
        Dict with slug, title, logo of the created project.
    """
    title = data.get("title", fallback_title)
    slug = slugify(title)

    # Ensure unique slug
    base_slug = slug
    counter = 1
    while project_path(slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    path = project_path(slug)
    ensure_dir(path)
    ensure_dir(path / "story-bible")
    ensure_dir(path / "parts")

    now = datetime.now(timezone.utc).isoformat()
    logo = random.choice(["quill", "scroll", "inkwell"])

    # Save project metadata
    write_json(path / "project.json", {
        "slug": slug,
        "title": title,
        "logo": logo,
        "created_at": now,
        "updated_at": now,
    })

    # Save story bible
    write_json(path / "story-bible" / "story_bible.json", {
        "metadata": data.get("metadata", {}),
        "characters": data.get("characters", []),
        "events": data.get("events", []),
        "environment": data.get("environment", []),
        "objects": data.get("objects", []),
    })

    # Save parts and chapters
    for i, part_data in enumerate(data.get("parts", [])):
        part_title = part_data.get("title", f"Part {i + 1}")
        part_slug = slugify(part_title)
        part_dir = path / "parts" / part_slug
        ensure_dir(part_dir / "chapters")

        write_json(part_dir / "part.json", {
            "slug": part_slug,
            "title": part_title,
            "order": i,
            "created_at": now,
        })

        for j, ch_data in enumerate(part_data.get("chapters", [])):
            ch_title = ch_data.get("title", f"Chapter {j + 1}")
            ch_slug = slugify(ch_title)
            ch_dir = part_dir / "chapters" / ch_slug
            ensure_dir(ch_dir)

            write_json(ch_dir / "chapter.json", {
                "slug": ch_slug,
                "title": ch_title,
                "part_slug": part_slug,
                "order": j,
                "word_count": 0,
                "created_at": now,
                "updated_at": now,
            })

            ch_content = ch_data.get("content", "")
            write_json(ch_dir / "content.json", text_to_tiptap(ch_content))

    logger.info("Project created: %s (%s)", title, slug)
    return {"slug": slug, "title": title, "logo": logo}
