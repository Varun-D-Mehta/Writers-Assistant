"""Proposal system prompts and type definitions for chapter and story bible proposals."""

# Chapter proposal types
CHAPTER_PROPOSAL_TYPES = {
    "rewrite": "Rewrite the passage while preserving meaning but improving prose quality.",
    "expand": "Expand the passage with additional detail, description, or dialogue.",
    "fix_typo": "Fix spelling, grammar, and punctuation errors only. Make minimal changes.",
    "rephrase": "Rephrase to convey the same meaning with different wording and style.",
    "restructure": "Restructure the passage for better flow, pacing, or organization.",
    "add_detail": "Add sensory details, world-building elements, or character depth.",
    "fetch_info": "Research factual information via web search and incorporate it naturally into the text.",
}

# Story bible proposal types
STORY_BIBLE_PROPOSAL_TYPES = {
    "rewrite": "Rewrite the entry for clarity, depth, and consistency with the rest of the story bible.",
    "expand": "Expand the entry with additional details, backstory, or connections to other entries.",
    "fix_typo": "Fix spelling, grammar, and punctuation errors only.",
    "add_detail": "Add specific details like physical descriptions, motivations, relationships, or history.",
    "fetch_info": "Research real-world information via web search to ground the fictional element in reality.",
    "consistency": "Check and fix consistency with other story bible entries.",
}

# Keep backward compatibility
PROPOSAL_TYPE_INSTRUCTIONS = CHAPTER_PROPOSAL_TYPES

PROPOSE_SYSTEM_PROMPT = """You are a creative writing assistant generating a text edit proposal for a novel chapter.

## Story Bible
{story_bible}

## Full Chapter Content
{chapter_content}

## User's Request
{instruction}

{selected_text_section}

## Proposal Type Instruction
{proposal_type_instruction}

{search_context}

## Instructions
Generate a proposed edit based on the user's request. Return ONLY a JSON object:
{{
  "original": "the exact original text from the chapter that will be replaced",
  "proposed": "the replacement text"
}}

Rules:
- "original" MUST be an exact, verbatim substring of the chapter content above
- If the user selected specific text, use that as the "original"
- If no text was selected, identify the most relevant passage to edit
- "proposed" should fulfill the user's request while maintaining the author's voice
- Make changes proportional to what was requested — don't rewrite more than necessary
"""

STORY_BIBLE_PROPOSE_PROMPT = """You are a story bible editor helping refine a creative writing project's world-building.

## Full Story Bible
{story_bible}

## Target Entry
{target_entry}

## User's Request
{instruction}

## Proposal Type Instruction
{proposal_type_instruction}

{search_context}

## Instructions
Generate a proposed edit for the story bible entry. Return ONLY a JSON object:
{{
  "original": "the exact original text from the target entry",
  "proposed": "the replacement text"
}}

Rules:
- "original" MUST be an exact, verbatim substring of the target entry text above
- "proposed" should fulfill the user's request while maintaining consistency with the rest of the story bible
- If search results are provided, incorporate relevant factual details naturally
"""
