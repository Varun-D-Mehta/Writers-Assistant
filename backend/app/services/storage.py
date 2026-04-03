"""Storage service for file-based project data persistence."""

import json
import os
from pathlib import Path

from config import settings


def data_root() -> Path:
    """Return the root data directory path."""
    return Path(settings.data_dir)


def projects_root() -> Path:
    """Return the root directory for all projects."""
    return data_root() / "projects"


def project_path(project_slug: str) -> Path:
    """Return the directory path for a specific project.

    Args:
        project_slug: The project identifier.
    """
    return projects_root() / project_slug


def story_bible_path(project_slug: str) -> Path:
    """Return the story bible directory path for a project.

    Args:
        project_slug: The project identifier.
    """
    return project_path(project_slug) / "story-bible"


def part_path(project_slug: str, part_slug: str) -> Path:
    """Return the directory path for a specific part within a project.

    Args:
        project_slug: The project identifier.
        part_slug: The part identifier.
    """
    return project_path(project_slug) / "parts" / part_slug


def chapter_path(project_slug: str, part_slug: str, chapter_slug: str) -> Path:
    """Return the directory path for a specific chapter within a part.

    Args:
        project_slug: The project identifier.
        part_slug: The part identifier.
        chapter_slug: The chapter identifier.
    """
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


def extract_tiptap_text(node: dict) -> str:
    """Extract plain text from a Tiptap JSON document.

    Args:
        node: A Tiptap document node dict.

    Returns:
        Plain text content extracted from the document.
    """
    text = ""
    if node.get("type") == "text":
        text += node.get("text", "")
    for child in node.get("content", []):
        text += extract_tiptap_text(child)
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
