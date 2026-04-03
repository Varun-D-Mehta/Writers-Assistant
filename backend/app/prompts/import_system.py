"""Prompts for parsing imported PDF text into structured project data."""

# Pass 1: Structure detection — LLM identifies boundaries and metadata,
# but does NOT output chapter content (that comes from raw text slicing).
IMPORT_STRUCTURE_PROMPT = """You are a document parser. Given text extracted from a PDF of a creative writing project, identify its structure.

## Extracted Text (may be truncated)
{text}

## Instructions
Identify the document structure and return a JSON object. Do NOT include chapter content — only identify titles and the exact marker text where each chapter begins.

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
        {{
          "title": "Chapter title",
          "start_marker": "the exact first ~80 characters of text where this chapter begins (verbatim from the extracted text)"
        }}
      ]
    }}
  ]
}}

Rules:
- For start_marker: copy the EXACT first ~80 characters of each chapter's opening text, verbatim from the extracted text above. This will be used to find the chapter in the full document.
- Do NOT include chapter content in your response — only titles and start markers.
- Extract story bible info (characters, events, environment, objects) as fully as possible.
- If the PDF doesn't contain story bible info, leave those arrays empty.
- If it's just manuscript text, put it all in a single part with chapters.
- Infer a project title from the content if none is explicit.
- Return valid JSON only.
"""

# Fallback: for very short documents where structure detection is overkill
IMPORT_SIMPLE_PROMPT = """You are a document parser. Given the text extracted from a PDF of a creative writing project, parse it into a structured format.

## Extracted Text
{text}

## Instructions
Parse this text into the following JSON structure. Include the COMPLETE chapter content — do not summarize or truncate.

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
        {{"title": "Chapter title", "content": "COMPLETE chapter text content"}}
      ]
    }}
  ]
}}

Rules:
- Include the FULL, COMPLETE text of each chapter — do not summarize or shorten.
- Extract as much structured information as possible.
- If the PDF doesn't contain story bible info, leave those arrays empty.
- If it's just manuscript text, put it all in a single part with chapters.
- Return valid JSON only.
"""
