"""Router for exporting projects as PDF documents."""

import json
import logging
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from fpdf import FPDF

from app.services.storage import (
    project_path,
    story_bible_path,
    part_path,
    read_json,
    list_dirs,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Path to a Unicode-capable TTF font bundled with fpdf2
_FONT_DIR = Path(__file__).resolve().parent.parent.parent


def _extract_tiptap_text(node: dict) -> str:
    """Extract plain text from a Tiptap JSON document."""
    text = ""
    if node.get("type") == "text":
        text += node.get("text", "")
    for child in node.get("content", []):
        text += _extract_tiptap_text(child)
        if child.get("type") in ("paragraph", "heading"):
            text += "\n"
    return text


def _safe(text: str) -> str:
    """Make text safe for PDF output by replacing Unicode chars with ASCII equivalents."""
    replacements = {
        "\u2018": "'", "\u2019": "'",  # smart single quotes
        "\u201c": '"', "\u201d": '"',  # smart double quotes
        "\u2013": "-", "\u2014": "--", # en/em dash
        "\u2026": "...",               # ellipsis
        "\u00a0": " ",                 # non-breaking space
        "\r": "",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    # Fallback: replace any remaining non-latin-1 chars
    return text.encode("latin-1", "replace").decode("latin-1")


class ProjectPDF(FPDF):
    """Custom PDF generator for writing projects with Unicode support."""

    def __init__(self, project_title: str):
        """Initialize PDF with Unicode font support."""
        super().__init__()
        self.project_title = project_title
        # Use built-in Helvetica — fpdf2 handles UTF-8 with standard fonts
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        """Render page header with project title."""
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, _safe(self.project_title), align="R", new_x="LMARGIN", new_y="NEXT")

    def footer(self):
        """Render page footer with page number."""
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def chapter_heading(self, title: str):
        """Render a major section heading."""
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(30, 41, 59)
        self.cell(0, 12, _safe(title), new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def section_heading(self, title: str):
        """Render a sub-section heading."""
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(59, 130, 246)
        self.cell(0, 10, _safe(title), new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def body_text(self, text: str):
        """Render body text."""
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 41, 59)
        self.multi_cell(0, 6, _safe(text))
        self.ln(2)

    def label_value(self, label: str, value: str):
        """Render a label: value pair."""
        if not value:
            return
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(100, 116, 139)
        self.cell(35, 6, _safe(f"{label}:"))
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 41, 59)
        self.multi_cell(0, 6, _safe(value))
        self.ln(1)

    def separator(self):
        """Render a horizontal separator line."""
        self.set_draw_color(200, 200, 200)
        y = self.get_y()
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.ln(4)


@router.get("/projects/{project_slug}/export/pdf")
async def export_project_pdf(project_slug: str):
    """Export a complete project as a downloadable PDF.

    The PDF includes structured section markers (e.g. [STORY BIBLE],
    [CHARACTERS], [MANUSCRIPT]) so it can be re-ingested via the
    import endpoint to recreate the project.
    """
    logger.info("Exporting project %s as PDF", project_slug)

    meta = read_json(project_path(project_slug) / "project.json")
    if not meta:
        raise HTTPException(404, "Project not found")

    title = meta.get("title", project_slug)
    pdf = ProjectPDF(title)
    pdf.alias_nb_pages()

    # ── Title page ─────────────────────────────────────
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(30, 41, 59)
    pdf.ln(60)
    pdf.cell(0, 20, _safe(title), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "I", 14)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 10, "Writers Assistant Export", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(160, 160, 160)
    pdf.cell(0, 6, f"Project: {title}", align="C", new_x="LMARGIN", new_y="NEXT")

    # ── Story Bible ────────────────────────────────────
    bible_file = story_bible_path(project_slug) / "story_bible.json"
    bible = read_json(bible_file, {})

    if bible:
        pdf.add_page()
        pdf.chapter_heading("[STORY BIBLE]")

        # Metadata / Overview
        md = bible.get("metadata", {})
        if md and any(v for v in md.values() if v):
            pdf.section_heading("[OVERVIEW]")
            for key, label in [
                ("title", "Title"), ("genre", "Genre"), ("setting", "Setting"),
                ("time_period", "Time Period"), ("pov", "Point of View"),
                ("tone", "Tone & Style"),
            ]:
                pdf.label_value(label, md.get(key, ""))
            if md.get("synopsis"):
                pdf.ln(2)
                pdf.label_value("Synopsis", md["synopsis"])
            pdf.separator()

        # Characters
        chars = bible.get("characters", [])
        if chars:
            pdf.section_heading("[CHARACTERS]")
            for c in chars:
                name = c.get("name") or "Unnamed"
                pdf.set_font("Helvetica", "B", 11)
                pdf.set_text_color(30, 41, 59)
                pdf.cell(0, 8, _safe(f"Character: {name}"), new_x="LMARGIN", new_y="NEXT")
                if c.get("description"):
                    pdf.label_value("Description", c["description"])
                if c.get("traits"):
                    traits = c["traits"] if isinstance(c["traits"], list) else [c["traits"]]
                    pdf.label_value("Traits", ", ".join(str(t) for t in traits))
                if c.get("notes"):
                    pdf.label_value("Notes", c["notes"])
                pdf.ln(3)
            pdf.separator()

        # Events
        events = bible.get("events", [])
        if events:
            pdf.section_heading("[EVENTS]")
            for i, e in enumerate(events, 1):
                name = e.get("name") or "Unnamed"
                pdf.set_font("Helvetica", "B", 11)
                pdf.set_text_color(30, 41, 59)
                pdf.cell(0, 8, _safe(f"Event {i}: {name}"), new_x="LMARGIN", new_y="NEXT")
                if e.get("description"):
                    pdf.body_text(e["description"])
                if e.get("chapter_refs"):
                    refs = e["chapter_refs"] if isinstance(e["chapter_refs"], list) else []
                    if refs:
                        pdf.label_value("Chapters", ", ".join(str(r) for r in refs))
                pdf.ln(1)
            pdf.separator()

        # Environment
        envs = bible.get("environment", [])
        if envs:
            pdf.section_heading("[ENVIRONMENT]")
            for e in envs:
                name = e.get("name") or "Unnamed"
                pdf.set_font("Helvetica", "B", 11)
                pdf.set_text_color(30, 41, 59)
                pdf.cell(0, 8, _safe(f"Setting: {name}"), new_x="LMARGIN", new_y="NEXT")
                if e.get("description"):
                    pdf.body_text(e["description"])
                pdf.ln(1)
            pdf.separator()

        # Objects
        objs = bible.get("objects", [])
        if objs:
            pdf.section_heading("[OBJECTS]")
            for o in objs:
                name = o.get("name") or "Unnamed"
                pdf.set_font("Helvetica", "B", 11)
                pdf.set_text_color(30, 41, 59)
                pdf.cell(0, 8, _safe(f"Object: {name}"), new_x="LMARGIN", new_y="NEXT")
                if o.get("description"):
                    pdf.label_value("Description", o["description"])
                if o.get("significance"):
                    pdf.label_value("Significance", o["significance"])
                if o.get("notes"):
                    pdf.label_value("Notes", o["notes"])
                pdf.ln(1)

    # ── Manuscript ─────────────────────────────────────
    parts_dir = project_path(project_slug) / "parts"
    part_slugs = list_dirs(parts_dir)

    if part_slugs:
        pdf.add_page()
        pdf.chapter_heading("[MANUSCRIPT]")

        for ps in part_slugs:
            part_meta = read_json(part_path(project_slug, ps) / "meta.json", {})
            part_title = part_meta.get("title", ps)

            pdf.section_heading(f"[PART: {part_title}]")

            chapters_dir = part_path(project_slug, ps) / "chapters"
            chapter_slugs = list_dirs(chapters_dir)

            for cs in chapter_slugs:
                ch_meta = read_json(chapters_dir / cs / "meta.json", {})
                ch_title = ch_meta.get("title", cs)

                pdf.set_font("Helvetica", "B", 11)
                pdf.set_text_color(30, 41, 59)
                pdf.cell(0, 10, _safe(f"[CHAPTER: {ch_title}]"), new_x="LMARGIN", new_y="NEXT")
                pdf.ln(2)

                content = read_json(
                    chapters_dir / cs / "content.json",
                    {"type": "doc", "content": []},
                )
                text = _extract_tiptap_text(content).strip()
                if text:
                    pdf.body_text(text)
                else:
                    pdf.body_text("(Empty chapter)")
                pdf.ln(4)

            pdf.separator()

    # ── Generate PDF ───────────────────────────────────
    pdf_bytes = pdf.output()
    buffer = BytesIO(pdf_bytes)
    buffer.seek(0)

    logger.info("PDF export complete for project %s (%d bytes)", project_slug, len(pdf_bytes))

    filename = f"{project_slug}.pdf"
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
    """Export a complete project as a downloadable plain text file.

    Uses structured markers for re-ingestion via the import endpoint.
    """
    logger.info("Exporting project %s as TXT", project_slug)

    meta = read_json(project_path(project_slug) / "project.json")
    if not meta:
        raise HTTPException(404, "Project not found")

    title = meta.get("title", project_slug)
    lines: list[str] = []

    lines.append(f"{'=' * 60}")
    lines.append(f"  {title}")
    lines.append(f"  Writers Assistant Export")
    lines.append(f"{'=' * 60}")
    lines.append("")

    # ── Story Bible ────────────────────────────────────
    bible_file = story_bible_path(project_slug) / "story_bible.json"
    bible = read_json(bible_file, {})

    if bible:
        lines.append("[STORY BIBLE]")
        lines.append("")

        # Metadata
        md = bible.get("metadata", {})
        if md and any(v for v in md.values() if v):
            lines.append("[OVERVIEW]")
            for key, label in [
                ("title", "Title"), ("genre", "Genre"), ("setting", "Setting"),
                ("time_period", "Time Period"), ("pov", "Point of View"),
                ("tone", "Tone & Style"),
            ]:
                val = md.get(key, "")
                if val:
                    lines.append(f"  {label}: {val}")
            if md.get("synopsis"):
                lines.append(f"  Synopsis: {md['synopsis']}")
            lines.append("")

        # Characters
        chars = bible.get("characters", [])
        if chars:
            lines.append("[CHARACTERS]")
            for c in chars:
                name = c.get("name") or "Unnamed"
                lines.append(f"  Character: {name}")
                if c.get("description"):
                    lines.append(f"    Description: {c['description']}")
                if c.get("traits"):
                    traits = c["traits"] if isinstance(c["traits"], list) else [c["traits"]]
                    lines.append(f"    Traits: {', '.join(str(t) for t in traits)}")
                if c.get("notes"):
                    lines.append(f"    Notes: {c['notes']}")
                lines.append("")

        # Events
        events = bible.get("events", [])
        if events:
            lines.append("[EVENTS]")
            for i, e in enumerate(events, 1):
                name = e.get("name") or "Unnamed"
                lines.append(f"  Event {i}: {name}")
                if e.get("description"):
                    lines.append(f"    {e['description']}")
                if e.get("chapter_refs"):
                    refs = e["chapter_refs"] if isinstance(e["chapter_refs"], list) else []
                    if refs:
                        lines.append(f"    Chapters: {', '.join(str(r) for r in refs)}")
                lines.append("")

        # Environment
        envs = bible.get("environment", [])
        if envs:
            lines.append("[ENVIRONMENT]")
            for e in envs:
                name = e.get("name") or "Unnamed"
                lines.append(f"  Setting: {name}")
                if e.get("description"):
                    lines.append(f"    {e['description']}")
                lines.append("")

        # Objects
        objs = bible.get("objects", [])
        if objs:
            lines.append("[OBJECTS]")
            for o in objs:
                name = o.get("name") or "Unnamed"
                lines.append(f"  Object: {name}")
                if o.get("description"):
                    lines.append(f"    Description: {o['description']}")
                if o.get("significance"):
                    lines.append(f"    Significance: {o['significance']}")
                if o.get("notes"):
                    lines.append(f"    Notes: {o['notes']}")
                lines.append("")

    # ── Manuscript ─────────────────────────────────────
    parts_dir = project_path(project_slug) / "parts"
    part_slugs = list_dirs(parts_dir)

    if part_slugs:
        lines.append("[MANUSCRIPT]")
        lines.append("")

        for ps in part_slugs:
            part_meta = read_json(part_path(project_slug, ps) / "meta.json", {})
            part_title = part_meta.get("title", ps)
            lines.append(f"[PART: {part_title}]")
            lines.append("")

            chapters_dir = part_path(project_slug, ps) / "chapters"
            chapter_slugs = list_dirs(chapters_dir)

            for cs in chapter_slugs:
                ch_meta = read_json(chapters_dir / cs / "meta.json", {})
                ch_title = ch_meta.get("title", cs)
                lines.append(f"[CHAPTER: {ch_title}]")
                lines.append("")

                content = read_json(
                    chapters_dir / cs / "content.json",
                    {"type": "doc", "content": []},
                )
                text = _extract_tiptap_text(content).strip()
                if text:
                    lines.append(text)
                else:
                    lines.append("(Empty chapter)")
                lines.append("")
                lines.append("---")
                lines.append("")

    text_content = "\n".join(lines)
    text_bytes = text_content.encode("utf-8")
    buffer = BytesIO(text_bytes)
    buffer.seek(0)

    logger.info("TXT export complete for project %s (%d bytes)", project_slug, len(text_bytes))

    filename = f"{project_slug}.txt"
    return StreamingResponse(
        buffer,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(text_bytes)),
        },
    )
