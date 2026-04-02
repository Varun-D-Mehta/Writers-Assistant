STORY_BIBLE_CHECK_PROMPT = """You are a story bible editor checking for internal consistency and completeness.

## Story Bible
{story_bible}

## Instructions
Analyze the story bible for:
- Internal contradictions between characters, events, and environment
- Incomplete or underdeveloped entries
- Missing connections between related elements
- Timeline inconsistencies in events

Return a JSON object:
{{
  "issues": [
    {{
      "id": "<uuid>",
      "severity": "error|warning|suggestion",
      "type": "contradiction|incomplete|missing_link|timeline",
      "title": "Short title",
      "description": "Detailed description of the issue",
      "quote": "The relevant text from the story bible entry",
      "fix_instruction": "How to fix this"
    }}
  ]
}}
"""
