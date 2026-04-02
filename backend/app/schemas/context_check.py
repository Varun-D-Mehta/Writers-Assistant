from pydantic import BaseModel


class ContextIssue(BaseModel):
    id: str
    severity: str  # "error" | "warning" | "suggestion"
    type: str
    title: str
    description: str
    quote: str
    fix_instruction: str


class ContextCheckRequest(BaseModel):
    project_slug: str
    part_slug: str
    chapter_slug: str


class ContextCheckResponse(BaseModel):
    issues: list[ContextIssue]


class FixRequest(BaseModel):
    project_slug: str
    issue: ContextIssue
    chapter_content: str


class FixResponse(BaseModel):
    original: str
    fixed: str
