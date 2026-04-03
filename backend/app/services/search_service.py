"""Web search service using DuckDuckGo for research-based ideas."""

import logging
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)


def web_search(query: str, max_results: int = 5) -> str:
    """Search the web and return formatted results as context for LLM.

    Args:
        query: The search query string.
        max_results: Maximum number of results to return.

    Returns:
        Formatted string of search results for LLM context.
    """
    logger.info("Executing web search: %s", query)
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        if not results:
            logger.warning("No search results found for: %s", query)
            return "No search results found."
        formatted = []
        for r in results:
            formatted.append(f"**{r.get('title', '')}**\n{r.get('body', '')}\nSource: {r.get('href', '')}")
        return "\n\n---\n\n".join(formatted)
    except Exception as e:
        logger.error("Web search failed: %s", e)
        return f"Search failed: {str(e)}"
