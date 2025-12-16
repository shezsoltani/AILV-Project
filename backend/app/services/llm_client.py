# app/services/llm_client.py

import logging
from typing import Optional

from openai import AsyncOpenAI, APIError
from openai import APITimeoutError, RateLimitError, BadRequestError

from ..config import settings


logger = logging.getLogger(__name__)


# -------------------------
# Custom Exception
# -------------------------

class LLMAPIError(Exception):
    """Exception für Fehler bei LLM-API-Aufrufen."""

    def __init__(
        self,
        status_code: Optional[int],
        message: str,
        detail: Optional[str] = None
    ):
        self.status_code = status_code
        self.message = message
        self.detail = detail
        super().__init__(self.message)

    def __str__(self) -> str:
        base = (
            f"LLM API Error (HTTP {self.status_code}): {self.message}"
            if self.status_code
            else f"LLM API Error: {self.message}"
        )
        return f"{base} - {self.detail}" if self.detail else base


# -------------------------
# OpenAI Client (Singleton)
# -------------------------

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not settings.openai_api_key:
            raise LLMAPIError(None, "OPENAI_API_KEY missing")

        _client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            timeout=60.0
        )
    return _client


# -------------------------
# Public API
# -------------------------

async def call_llm(prompt: str) -> str:
    prompt = prompt.strip()
    if not prompt:
        raise ValueError("prompt must not be empty")

    if not settings.openai_api_key:
        raise LLMAPIError(None, "OPENAI_API_KEY missing")

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    try:
        resp = await client.chat.completions.create(
            model=settings.openai_model_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that returns only the requested output format."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
        )

        if not resp.choices:
            raise LLMAPIError(None, "LLM returned no choices")

        content = resp.choices[0].message.content
        if not content:
            raise LLMAPIError(None, "LLM returned empty content")

        return content.strip()

    except Exception as e:
        raise LLMAPIError(None, "LLM API error", str(e))
