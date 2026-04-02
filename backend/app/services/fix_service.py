from app.prompts.fix_system import FIX_SYSTEM_PROMPT


def build_fix_prompt(
    issue: dict,
    chapter_content: str,
) -> list[dict]:
    system_prompt = FIX_SYSTEM_PROMPT.format(
        issue_title=issue.get("title", ""),
        issue_description=issue.get("description", ""),
        issue_quote=issue.get("quote", ""),
        fix_instruction=issue.get("fix_instruction", ""),
        chapter_content=chapter_content,
    )

    return [{"role": "system", "content": system_prompt}]
