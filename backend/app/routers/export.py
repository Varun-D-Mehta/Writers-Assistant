"""Router for exporting projects as PDF and plain text."""

import logging
from io import BytesIO

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.services.export_service import generate_pdf, generate_txt

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/projects/{project_slug}/export/pdf")
async def export_project_pdf(project_slug: str):
    """Export a complete project as a downloadable PDF."""
    logger.info("Exporting project %s as PDF", project_slug)

    pdf_bytes = generate_pdf(project_slug)
    if pdf_bytes is None:
        raise HTTPException(404, "Project not found")

    buffer = BytesIO(pdf_bytes)
    buffer.seek(0)
    filename = f"{project_slug}.pdf"

    logger.info("PDF export complete for project %s (%d bytes)", project_slug, len(pdf_bytes))
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@router.get("/projects/{project_slug}/export/txt")
async def export_project_txt(project_slug: str):
    """Export a complete project as a downloadable plain text file."""
    logger.info("Exporting project %s as TXT", project_slug)

    text_content = generate_txt(project_slug)
    if text_content is None:
        raise HTTPException(404, "Project not found")

    text_bytes = text_content.encode("utf-8")
    buffer = BytesIO(text_bytes)
    buffer.seek(0)
    filename = f"{project_slug}.txt"

    logger.info("TXT export complete for project %s (%d bytes)", project_slug, len(text_bytes))
    return StreamingResponse(
        buffer,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(text_bytes)),
        },
    )
