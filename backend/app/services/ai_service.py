"""AI service for interacting with OpenAI's chat completion API."""

import logging
from collections.abc import AsyncGenerator

from openai import AsyncOpenAI

from config import settings

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=settings.openai_api_key)


async def chat_stream(
    messages: list[dict], model: str = "gpt-4o"
) -> AsyncGenerator[str, None]:
    """Stream chat completion tokens from the OpenAI API.

    Args:
        messages: List of message dicts with 'role' and 'content'.
        model: The model to use for completion.

    Yields:
        Individual content tokens as strings.
    """
    logger.info("Starting streaming chat completion with model=%s, messages=%d", model, len(messages))
    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
    )
    async for chunk in response:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


async def chat_completion(
    messages: list[dict], model: str = "gpt-4o"
) -> str:
    """Get a single chat completion response from the OpenAI API.

    Args:
        messages: List of message dicts with 'role' and 'content'.
        model: The model to use for completion.

    Returns:
        The assistant's response content as a string.
    """
    logger.info("Requesting chat completion with model=%s, messages=%d", model, len(messages))
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
        )
        logger.info("Chat completion received successfully")
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error("Chat completion failed: %s", e)
        raise


async def json_completion(
    messages: list[dict], model: str = "gpt-4o"
) -> str:
    """Get a JSON-formatted chat completion response from the OpenAI API.

    Args:
        messages: List of message dicts with 'role' and 'content'.
        model: The model to use for completion.

    Returns:
        The assistant's JSON response content as a string.
    """
    logger.info("Requesting JSON completion with model=%s, messages=%d", model, len(messages))
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
        )
        logger.info("JSON completion received successfully")
        return response.choices[0].message.content or "{}"
    except Exception as e:
        logger.error("JSON completion failed: %s", e)
        raise
