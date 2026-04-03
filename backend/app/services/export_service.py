"""Service for exporting projects as PDF and plain text."""

import logging
from io import BytesIO

from fpdf import FPDF

from app.services.storage import (
    extract_tiptap_text,
    project_path,
    story_bible_path,
    part_path,
    read_json,
    list_dirs,
)

logger = logging.getLogger(__name__)


# ── Shared helpers ────────────────────────────────────────────────


def _safe(text: str) -> str:
    """Make text safe for PDF output by replacing Unicode chars with ASCII equivalents."""
    replacements = {
        "\u2018": "'", "\u2019": "'",
        "\u201c": '"', "\u201d": '"',
        "\u2013": "-", "\u2014": "--",
        "\u2026": "...",
        "\u00a0": " ",
        "\r": "",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text.encode("latin-1", "replace").decode("latin-1")


def load_project_data(project_slug: str) -> dict | None:
    """Load all project data needed for export.

    Returns a dict with title, bible, and parts/chapters structure,
    or None if the project doesn't exist.
    """
    meta = read_json(project_path(project_slug) / "project.json")
    if not meta:
        return None

    title = meta.get("title", project_slug)

    # Story bible
    bible_file = story_bible_path(project_slug) / "story_bible.json"
    bible = read_json(bible_file, {})

    # Parts and chapters
    parts_dir = project_path(project_slug) / "parts"
    part_slugs = list_dirs(parts_dir)

    parts = []
    for ps in part_slugs:
        part_meta = read_json(part_path(project_slug, ps) / "part.json", {})
        part_title = part_meta.get("title", ps)

        chapters_dir = part_path(project_slug, ps) / "chapters"
        chapter_slugs = list_dirs(chapters_dir)

        chapters = []
        for cs in chapter_slugs:
            ch_meta = read_json(chapters_dir / cs / "chapter.json", {})
            ch_title = ch_meta.get("title", cs)
            content = read_json(
                chapters_dir / cs / "content.json",
                {"type": "doc", "content": []},
            )
            text = extract_tiptap_text(content).strip()
            chapters.append({"title": ch_title, "text": text})

        parts.append({"title": part_title, "chapters": chapters})

    return {"title": title, "bible": bible, "parts": parts}


# ── Bible rendering helpers ───────────────────────────────────────

METADATA_FIELDS = [
    ("title", "Title"), ("genre", "Genre"), ("setting", "Setting"),
    ("time_period", "Time Period"), ("pov", "Point of View"),
    ("tone", "Tone & Style"),
]


def _indent_multiline(text: str, label: str, indent: str = "    ") -> list[str]:
    """Format a labeled multi-line field with proper continuation indentation.

    First line:  '    Label: first line of text'
    Continuation: '      rest of text' (6 spaces — deeper than field labels)
    """
    text_lines = text.split("\n")
    result = [f"{indent}{label}: {text_lines[0]}"]
    cont_indent = indent + "  "
    for line in text_lines[1:]:
        result.append(f"{cont_indent}{line}" if line.strip() else "")
    return result


def _render_bible_txt(bible: dict) -> list[str]:
    """Render story bible as text lines."""
    lines: list[str] = []
    if not bible:
        return lines

    lines.append("[STORY BIBLE]")
    lines.append("")

    md = bible.get("metadata", {})
    if md and any(v for v in md.values() if v):
        lines.append("[OVERVIEW]")
        for key, label in METADATA_FIELDS:
            val = md.get(key, "")
            if val:
                lines.extend(_indent_multiline(val, label, "  "))
        if md.get("synopsis"):
            lines.extend(_indent_multiline(md["synopsis"], "Synopsis", "  "))
        lines.append("")

    chars = bible.get("characters", [])
    if chars:
        lines.append("[CHARACTERS]")
        for c in chars:
            name = c.get("name") or "Unnamed"
            lines.append(f"  Character: {name}")
            if c.get("description"):
                lines.extend(_indent_multiline(c["description"], "Description"))
            if c.get("traits"):
                traits = c["traits"] if isinstance(c["traits"], list) else [c["traits"]]
                lines.append(f"    Traits: {', '.join(str(t) for t in traits)}")
            if c.get("notes"):
                lines.extend(_indent_multiline(c["notes"], "Notes"))
            lines.append("")

    events = bible.get("events", [])
    if events:
        lines.append("[EVENTS]")
        for i, e in enumerate(events, 1):
            name = e.get("name") or "Unnamed"
            lines.append(f"  Event {i}: {name}")
            if e.get("description"):
                lines.extend(_indent_multiline(e["description"], "Description"))
            if e.get("chapter_refs"):
                refs = e["chapter_refs"] if isinstance(e["chapter_refs"], list) else []
                if refs:
                    lines.append(f"    Chapters: {', '.join(str(r) for r in refs)}")
            lines.append("")

    envs = bible.get("environment", [])
    if envs:
        lines.append("[ENVIRONMENT]")
        for e in envs:
            name = e.get("name") or "Unnamed"
            lines.append(f"  Setting: {name}")
            if e.get("description"):
                lines.extend(_indent_multiline(e["description"], "Description"))
            details = e.get("details", {})
            for dk, dv in details.items():
                lines.append(f"    {dk}: {dv}")
            lines.append("")

    objs = bible.get("objects", [])
    if objs:
        lines.append("[OBJECTS]")
        for o in objs:
            name = o.get("name") or "Unnamed"
            lines.append(f"  Object: {name}")
            if o.get("description"):
                lines.extend(_indent_multiline(o["description"], "Description"))
            if o.get("significance"):
                lines.extend(_indent_multiline(o["significance"], "Significance"))
            if o.get("notes"):
                lines.extend(_indent_multiline(o["notes"], "Notes"))
            lines.append("")

    return lines


def _render_bible_pdf(pdf: "ProjectPDF", bible: dict) -> None:
    """Render story bible sections into a PDF."""
    if not bible:
        return

    pdf.add_page()
    pdf.chapter_heading("[STORY BIBLE]")

    md = bible.get("metadata", {})
    if md and any(v for v in md.values() if v):
        pdf.section_heading("[OVERVIEW]")
        for key, label in METADATA_FIELDS:
            pdf.label_value(label, md.get(key, ""))
        if md.get("synopsis"):
            pdf.ln(2)
            pdf.label_value("Synopsis", md["synopsis"])
        pdf.separator()

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
            details = e.get("details", {})
            for dk, dv in details.items():
                pdf.label_value(dk, dv)
            pdf.ln(1)
        pdf.separator()

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


# ── PDF generator class ──────────────────────────────────────────


class ProjectPDF(FPDF):
    """Custom PDF generator for writing projects."""

    def __init__(self, project_title: str):
        super().__init__()
        self.project_title = project_title
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, _safe(self.project_title), align="R", new_x="LMARGIN", new_y="NEXT")

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def chapter_heading(self, title: str):
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(30, 41, 59)
        self.cell(0, 12, _safe(title), new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def section_heading(self, title: str):
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(59, 130, 246)
        self.cell(0, 10, _safe(title), new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def body_text(self, text: str):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 41, 59)
        self.multi_cell(0, 6, _safe(text))
        self.ln(2)

    def label_value(self, label: str, value: str):
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
        self.set_draw_color(200, 200, 200)
        y = self.get_y()
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.ln(4)


# ── Public export functions ───────────────────────────────────────


def generate_pdf(project_slug: str) -> bytes | None:
    """Generate a PDF for a project. Returns bytes or None if project not found."""
    data = load_project_data(project_slug)
    if not data:
        return None

    title = data["title"]
    pdf = ProjectPDF(title)
    pdf.alias_nb_pages()

    # Title page
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

    # Story bible
    _render_bible_pdf(pdf, data["bible"])

    # Manuscript
    parts = data["parts"]
    if parts:
        pdf.add_page()
        pdf.chapter_heading("[MANUSCRIPT]")

        for part in parts:
            pdf.section_heading(f"[PART: {part['title']}]")

            for ch in part["chapters"]:
                pdf.set_font("Helvetica", "B", 11)
                pdf.set_text_color(30, 41, 59)
                pdf.cell(0, 10, _safe(f"[CHAPTER: {ch['title']}]"), new_x="LMARGIN", new_y="NEXT")
                pdf.ln(2)
                pdf.body_text(ch["text"] or "(Empty chapter)")
                pdf.ln(4)

            pdf.separator()

    logger.info("PDF generated for project %s", project_slug)
    return bytes(pdf.output())


def generate_txt(project_slug: str) -> str | None:
    """Generate plain text export for a project. Returns string or None if not found."""
    data = load_project_data(project_slug)
    if not data:
        return None

    title = data["title"]
    lines: list[str] = []

    lines.append(f"{'=' * 60}")
    lines.append(f"  {title}")
    lines.append(f"  Writers Assistant Export")
    lines.append(f"{'=' * 60}")
    lines.append("")

    # Story bible
    lines.extend(_render_bible_txt(data["bible"]))

    # Manuscript
    parts = data["parts"]
    if parts:
        lines.append("[MANUSCRIPT]")
        lines.append("")

        for part in parts:
            lines.append(f"[PART: {part['title']}]")
            lines.append("")

            for ch in part["chapters"]:
                lines.append(f"[CHAPTER: {ch['title']}]")
                lines.append("")
                lines.append(ch["text"] or "(Empty chapter)")
                lines.append("")
                lines.append("---")
                lines.append("")

    logger.info("TXT generated for project %s", project_slug)
    return "\n".join(lines)
