"""Router for importing projects from PDF files."""

import json
import logging
import random
from io import BytesIO
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, File
from slugify import slugify
import pdfplumber

from app.services.ai_service import json_completion
from app.services.storage import (
    project_path,
    ensure_dir,
    write_json,
)

logger = logging.getLogger(__name__)
router = APIRouter()

IMPORT_PROMPT = """You are a document parser. Given the text extracted from a PDF of a creative writing project, parse it into a structured format.

## Extracted Text
{text}

## Instructions
Parse this text into the following JSON structure. Extract whatever information is available:
{{
  "title": "project title (infer from content if not explicit)",
  "metadata": {{
    "title": "",
    "genre": "",
    "setting": "",
    "time_period": "",
    "pov": "",
    "tone": "",
    "synopsis": ""
  }},
  "characters": [
    {{"name": "", "description": "", "traits": [], "notes": ""}}
  ],
  "events": [
    {{"name": "", "description": "", "chapter_refs": []}}
  ],
  "environment": [
    {{"name": "", "description": "", "details": {{}}}}
  ],
  "objects": [
    {{"name": "", "description": "", "significance": "", "notes": ""}}
  ],
  "parts": [
    {{
      "title": "Part title",
      "chapters": [
        {{"title": "Chapter title", "content": "chapter text content"}}
      ]
    }}
  ]
}}

Rules:
- Extract as much structured information as possible
- If the PDF doesn't contain story bible info, leave those arrays empty
- If it's just manuscript text, put it all in a single part with chapters
- Infer a project title from the content if none is explicit
- Return valid JSON only
"""


@router.post("/import/pdf")
async def import_project_from_pdf(file: UploadFile = File(...)) -> dict:
    """Import a project from an uploaded PDF file.

    Extracts text from the PDF, uses LLM to parse it into structured
    project data, and creates a new project with the parsed content.
    """
    logger.info("Importing project from PDF: %s", file.filename)

    # Extract text from PDF
    content = await file.read()
    text = ""
    with pdfplumber.open(BytesIO(content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n\n"

    if not text.strip():
        return {"error": "Could not extract text from PDF"}

    # Truncate if too long (LLM context limit)
    if len(text) > 30000:
        text = text[:30000] + "\n\n[... truncated ...]"

    logger.info("Extracted %d characters from PDF", len(text))

    # Use LLM to parse the text
    prompt = IMPORT_PROMPT.format(text=text)
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "Parse this document into structured project data."},
    ]

    result = await json_completion(messages)
    data = json.loads(result)

    # Create the project
    title = data.get("title", file.filename or "Imported Project")
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
    story_bible = {
        "metadata": data.get("metadata", {}),
        "characters": data.get("characters", []),
        "events": data.get("events", []),
        "environment": data.get("environment", []),
        "objects": data.get("objects", []),
    }
    write_json(path / "story-bible" / "story_bible.json", story_bible)

    # Save parts and chapters
    parts = data.get("parts", [])
    for i, part_data in enumerate(parts):
        part_title = part_data.get("title", f"Part {i + 1}")
        part_slug = slugify(part_title)
        part_dir = path / "parts" / part_slug
        ensure_dir(part_dir / "chapters")

        write_json(part_dir / "meta.json", {
            "slug": part_slug,
            "title": part_title,
            "order": i,
            "created_at": now,
        })

        chapters = part_data.get("chapters", [])
        for j, ch_data in enumerate(chapters):
            ch_title = ch_data.get("title", f"Chapter {j + 1}")
            ch_slug = slugify(ch_title)
            ch_dir = part_dir / "chapters" / ch_slug
            ensure_dir(ch_dir)

            write_json(ch_dir / "meta.json", {
                "slug": ch_slug,
                "title": ch_title,
                "part_slug": part_slug,
                "order": j,
                "word_count": 0,
                "created_at": now,
                "updated_at": now,
            })

            # Convert text to Tiptap JSON
            ch_content = ch_data.get("content", "")
            paragraphs = [p.strip() for p in ch_content.split("\n") if p.strip()]
            tiptap_doc = {
                "type": "doc",
                "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": p}]}
                    for p in paragraphs
                ] if paragraphs else [],
            }
            write_json(ch_dir / "content.json", tiptap_doc)

    logger.info("Project imported successfully: %s (%s)", title, slug)

    return {
        "slug": slug,
        "title": title,
        "logo": logo,
    }
