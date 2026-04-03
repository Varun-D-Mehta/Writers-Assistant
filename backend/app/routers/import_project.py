"""Router for importing projects from Writers Assistant export files."""

import json
import logging

from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse

from app.services.import_service import (
    create_project_from_data,
    extract_pdf_text,
    parse_export_text,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/import/pdf")
async def import_project_from_file(file: UploadFile = File(...)):
    """Import a project from a Writers Assistant export file (PDF or TXT).

    Only files exported by Writers Assistant are accepted.
    Streams SSE progress events during the import process.
    """
    logger.info("Importing from file: %s", file.filename)

    async def stream():
        # Step 1: Read and extract text
        yield _sse({"step": "extract", "message": "Reading file..."})
        content = await file.read()
        filename = file.filename or ""

        if filename.lower().endswith(".pdf"):
            text = extract_pdf_text(content)
        else:
            text = content.decode("utf-8", errors="replace")

        if not text.strip():
            yield _sse({"error": "Could not extract text from file. PDF may be image-based."})
            return

        yield _sse({"step": "extract_done", "message": f"Read {len(text):,} characters"})

        # Step 2: Parse the structured export format
        yield _sse({"step": "parse", "message": "Parsing export format..."})
        try:
            data = parse_export_text(text)
        except ValueError as e:
            yield _sse({"error": str(e)})
            return

        chapter_count = sum(len(p.get("chapters", [])) for p in data.get("parts", []))
        yield _sse({
            "step": "parse_done",
            "message": f"Found {len(data.get('parts', []))} part(s), {chapter_count} chapter(s)",
        })

        # Step 3: Create project structure
        yield _sse({"step": "create", "message": "Creating project..."})
        project = create_project_from_data(data, fallback_title=filename.rsplit(".", 1)[0] or "Imported Project")

        logger.info("Project imported successfully: %s", project["slug"])
        yield _sse({"step": "done", "project": project})

    return StreamingResponse(stream(), media_type="text/event-stream")


def _sse(data: dict) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(data)}\n\n"
