"""AI service for interacting with OpenAI's chat completion API."""

import logging
from collections.abc import AsyncGenerator
from dataclasses import dataclass

from openai import AsyncOpenAI

from config import settings

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=settings.openai_api_key)

DEFAULT_MODEL = settings.openai_model
DEFAULT_TEMPERATURE = settings.openai_temperature


@dataclass
class UsageResult:
    """Token usage from an API call."""
    content: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass
class StreamUsage:
    """Token usage collected after a streaming call completes."""
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


async def chat_stream(
    messages: list[dict],
    model: str | None = None,
    temperature: float | None = None,
) -> AsyncGenerator[str | StreamUsage, None]:
    """Stream chat completion tokens from the OpenAI API.

    Yields individual content tokens as strings, and a final StreamUsage
    object with token counts after the stream completes.
    """
    model = model or DEFAULT_MODEL
    temperature = temperature if temperature is not None else DEFAULT_TEMPERATURE
    logger.info("Starting streaming chat completion with model=%s, messages=%d", model, len(messages))
    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        stream=True,
        stream_options={"include_usage": True},
    )
    async for chunk in response:
        if chunk.usage:
            yield StreamUsage(
                model=chunk.model or model,
                prompt_tokens=chunk.usage.prompt_tokens,
                completion_tokens=chunk.usage.completion_tokens,
                total_tokens=chunk.usage.total_tokens,
            )
        elif chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


async def chat_completion(
    messages: list[dict],
    model: str | None = None,
    temperature: float | None = None,
) -> UsageResult:
    """Get a single chat completion response from the OpenAI API.

    Returns a UsageResult with the response content and token counts.
    """
    model = model or DEFAULT_MODEL
    temperature = temperature if temperature is not None else DEFAULT_TEMPERATURE
    logger.info("Requesting chat completion with model=%s, messages=%d", model, len(messages))
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )
        usage = response.usage
        logger.info("Chat completion received: %d tokens", usage.total_tokens if usage else 0)
        return UsageResult(
            content=response.choices[0].message.content or "",
            model=response.model or model,
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            total_tokens=usage.total_tokens if usage else 0,
        )
    except Exception as e:
        logger.error("Chat completion failed: %s", e)
        raise


async def json_completion(
    messages: list[dict],
    model: str | None = None,
    temperature: float | None = None,
) -> UsageResult:
    """Get a JSON-formatted chat completion response from the OpenAI API.

    Returns a UsageResult with the JSON response content and token counts.
    """
    model = model or DEFAULT_MODEL
    temperature = temperature if temperature is not None else DEFAULT_TEMPERATURE
    logger.info("Requesting JSON completion with model=%s, messages=%d", model, len(messages))
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        usage = response.usage
        logger.info("JSON completion received: %d tokens", usage.total_tokens if usage else 0)
        return UsageResult(
            content=response.choices[0].message.content or "{}",
            model=response.model or model,
            prompt_tokens=usage.prompt_tokens if usage else 0,
            completion_tokens=usage.completion_tokens if usage else 0,
            total_tokens=usage.total_tokens if usage else 0,
        )
    except Exception as e:
        logger.error("JSON completion failed: %s", e)
        raise
