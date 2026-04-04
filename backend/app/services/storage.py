"""Storage service for file-based project data persistence."""

import json
import os
import re
from pathlib import Path

from config import settings

# Slug validation: only alphanumeric, hyphens, underscores
_SLUG_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]*$")


def _validate_slug(slug: str, label: str = "slug") -> str:
    """Validate a slug to prevent path traversal attacks.

    Raises ValueError if the slug contains dangerous characters.
    """
    if not slug or not _SLUG_PATTERN.match(slug):
        raise ValueError(f"Invalid {label}: must be alphanumeric with hyphens/underscores")
    return slug


def data_root() -> Path:
    """Return the root data directory path."""
    return Path(settings.data_dir)


def projects_root() -> Path:
    """Return the root directory for all projects."""
    return data_root() / "projects"


def project_path(project_slug: str) -> Path:
    """Return the directory path for a specific project."""
    _validate_slug(project_slug, "project_slug")
    path = projects_root() / project_slug
    # Double-check resolved path is inside projects root
    if not str(path.resolve()).startswith(str(projects_root().resolve())):
        raise ValueError("Invalid project path")
    return path


def story_bible_path(project_slug: str) -> Path:
    """Return the story bible directory path for a project."""
    return project_path(project_slug) / "story-bible"


def part_path(project_slug: str, part_slug: str) -> Path:
    """Return the directory path for a specific part within a project."""
    _validate_slug(part_slug, "part_slug")
    return project_path(project_slug) / "parts" / part_slug


def chapter_path(project_slug: str, part_slug: str, chapter_slug: str) -> Path:
    """Return the directory path for a specific chapter within a part."""
    _validate_slug(chapter_slug, "chapter_slug")
    return part_path(project_slug, part_slug) / "chapters" / chapter_slug


def ensure_dir(path: Path) -> None:
    """Create a directory and all parent directories if they don't exist.

    Args:
        path: The directory path to create.
    """
    path.mkdir(parents=True, exist_ok=True)


def read_json(path: Path, default=None):
    """Read and parse a JSON file.

    Args:
        path: The file path to read.
        default: Value to return if the file doesn't exist.

    Returns:
        Parsed JSON data, or the default value if file not found.
    """
    if not path.exists():
        return default
    with open(path, "r") as f:
        return json.load(f)


def write_json(path: Path, data) -> None:
    """Write data to a JSON file, creating parent directories as needed.

    Args:
        path: The file path to write to.
        data: The data to serialize as JSON.
    """
    ensure_dir(path.parent)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


def extract_tiptap_text(node: dict, _depth: int = 0) -> str:
    """Extract plain text from a Tiptap JSON document.

    Args:
        node: A Tiptap document node dict.
        _depth: Internal recursion depth counter (max 50).

    Returns:
        Plain text content extracted from the document.
    """
    if _depth > 50:
        return ""
    text = ""
    if node.get("type") == "text":
        text += node.get("text", "")
    for child in node.get("content", []):
        text += extract_tiptap_text(child, _depth + 1)
        if child.get("type") in ("paragraph", "heading"):
            text += "\n"
    return text


def word_count(content: dict) -> int:
    """Count words in a Tiptap JSON document."""
    return len(extract_tiptap_text(content).split())


def list_dirs(path: Path) -> list[str]:
    """List all subdirectory names within a directory, sorted alphabetically.

    Args:
        path: The directory to list.

    Returns:
        Sorted list of subdirectory names.
    """
    if not path.exists():
        return []
    return sorted(
        [d.name for d in path.iterdir() if d.is_dir()],
    )
