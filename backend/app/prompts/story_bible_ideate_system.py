"""Prompt and type definitions for story bible entry ideas."""

SECTION_SCHEMAS = {
    "characters": '{"name": "", "description": "", "traits": [""], "notes": ""}',
    "events": '{"name": "", "description": "", "chapter_refs": [""]}',
    "environment": '{"name": "", "description": "", "details": {}}',
    "objects": '{"name": "", "description": "", "significance": "", "notes": ""}',
}

BIBLE_PROPOSE_TYPES = {
    "rewrite": "Rewrite for clarity, depth, and consistency.",
    "expand": "Expand with additional details, backstory, or connections.",
    "fix_typo": "Fix spelling, grammar, and punctuation only.",
    "add_detail": "Add specific details like descriptions, motivations, or history.",
    "fetch_info": "Incorporate real-world research to ground the element in reality.",
    "consistency": "Fix consistency issues with other story bible entries.",
}

BIBLE_PROPOSE_PROMPT = """You are a story bible editor for a creative writing project.

## Full Story Bible
{story_bible}

## Section Type: {section_type}
## Current Entry (index {entry_index})
{current_entry}

## Task: {proposal_type_instruction}
## User Instruction: {instruction}

{search_context}

Return ONLY a JSON object with the COMPLETE updated entry matching this schema:
{entry_schema}

Rules:
- Return the FULL entry with ALL fields populated
- Apply the requested changes while keeping unchanged fields intact
- Maintain consistency with the rest of the story bible
- If search results are provided, incorporate relevant details naturally
"""
