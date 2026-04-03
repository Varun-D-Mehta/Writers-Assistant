"""Service for tracking AI token usage per project and chapter."""

import logging
from datetime import datetime, timezone

from app.services.ai_service import StreamUsage, UsageResult
from app.services.storage import project_path, read_json, write_json

logger = logging.getLogger(__name__)

# Approximate pricing per 1M tokens (USD) — update as OpenAI changes pricing
MODEL_PRICING = {
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
}


def _usage_path(project_slug: str):
    return project_path(project_slug) / "usage.json"


def _estimate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Estimate USD cost for a given model and token counts."""
    pricing = MODEL_PRICING.get(model)
    if not pricing:
        # Fallback: assume gpt-4o pricing for unknown models
        pricing = MODEL_PRICING["gpt-4o"]
    input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
    output_cost = (completion_tokens / 1_000_000) * pricing["output"]
    return round(input_cost + output_cost, 6)


def record_usage(
    project_slug: str,
    feature: str,
    usage: UsageResult | StreamUsage,
    chapter_slug: str | None = None,
) -> None:
    """Record a single AI call's token usage.

    Args:
        project_slug: The project this usage belongs to.
        feature: What triggered the call (e.g. "chat", "propose", "predict",
                 "context_check", "fix", "bible_chat", "bible_propose",
                 "bible_context_check", "import").
        usage: Token counts from the AI call.
        chapter_slug: Optional chapter slug for chapter-level tracking.
    """
    path = _usage_path(project_slug)
    data = read_json(path, {"calls": [], "totals": {}})

    cost = _estimate_cost(usage.model, usage.prompt_tokens, usage.completion_tokens)

    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "feature": feature,
        "model": usage.model,
        "prompt_tokens": usage.prompt_tokens,
        "completion_tokens": usage.completion_tokens,
        "total_tokens": usage.total_tokens,
        "cost_usd": cost,
    }
    if chapter_slug:
        entry["chapter_slug"] = chapter_slug

    data["calls"].append(entry)

    # Update running totals
    totals = data.get("totals", {})
    totals["prompt_tokens"] = totals.get("prompt_tokens", 0) + usage.prompt_tokens
    totals["completion_tokens"] = totals.get("completion_tokens", 0) + usage.completion_tokens
    totals["total_tokens"] = totals.get("total_tokens", 0) + usage.total_tokens
    totals["total_cost_usd"] = round(totals.get("total_cost_usd", 0) + cost, 6)
    totals["call_count"] = totals.get("call_count", 0) + 1
    data["totals"] = totals

    write_json(path, data)
    logger.debug("Recorded usage for %s/%s: %d tokens, $%.6f",
                 project_slug, feature, usage.total_tokens, cost)


def get_usage(project_slug: str) -> dict:
    """Get full usage data for a project."""
    return read_json(_usage_path(project_slug), {"calls": [], "totals": {}})


def get_usage_summary(project_slug: str) -> dict:
    """Get a summarized view of usage: totals + per-feature + per-chapter breakdowns."""
    data = read_json(_usage_path(project_slug), {"calls": [], "totals": {}})

    by_feature: dict[str, dict] = {}
    by_chapter: dict[str, dict] = {}

    for call in data.get("calls", []):
        feature = call.get("feature", "unknown")
        if feature not in by_feature:
            by_feature[feature] = {"total_tokens": 0, "cost_usd": 0, "call_count": 0}
        by_feature[feature]["total_tokens"] += call.get("total_tokens", 0)
        by_feature[feature]["cost_usd"] = round(
            by_feature[feature]["cost_usd"] + call.get("cost_usd", 0), 6
        )
        by_feature[feature]["call_count"] += 1

        ch = call.get("chapter_slug")
        if ch:
            if ch not in by_chapter:
                by_chapter[ch] = {"total_tokens": 0, "cost_usd": 0, "call_count": 0}
            by_chapter[ch]["total_tokens"] += call.get("total_tokens", 0)
            by_chapter[ch]["cost_usd"] = round(
                by_chapter[ch]["cost_usd"] + call.get("cost_usd", 0), 6
            )
            by_chapter[ch]["call_count"] += 1

    return {
        "totals": data.get("totals", {}),
        "by_feature": by_feature,
        "by_chapter": by_chapter,
    }
