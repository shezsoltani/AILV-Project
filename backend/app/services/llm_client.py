# app/services/llm_client.py

import logging

from openai import AsyncOpenAI, APIError
from openai import APITimeoutError, RateLimitError, BadRequestError
from ..core.exceptions import LLMAPIError
from ..config import settings
from .llm_provider import LLMProvider


logger = logging.getLogger(__name__)

class OpenAILLMProvider:
    def __init__(self, model: str | None = None) -> None:
        self.model = model or settings.openai_model_name
        self._client: AsyncOpenAI | None = None

    def _get_client(self) -> AsyncOpenAI:
        if self._client is None:
            if not settings.openai_api_key:
                raise LLMAPIError("OPENAI_API_KEY missing")

            self._client = AsyncOpenAI(
                api_key=settings.openai_api_key,
                timeout=60.0,
            )

        return self._client

    async def complete(self, prompt: str) -> str:
        prompt = prompt.strip()
        if not prompt:
            raise ValueError("prompt must not be empty")

        client = self._get_client()

        try:
            resp = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that returns only the requested output format.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
            )

            if not resp.choices:
                raise LLMAPIError("LLM returned no choices")

            content = resp.choices[0].message.content
            if not content:
                raise LLMAPIError("LLM returned empty content")

            return content.strip()

        # Bereits gewrappte Fehler nicht nochmals einwickeln.
        except LLMAPIError:
            raise
        # Granulare Exception-Handler geben dem Nutzer/Logging spezifische, lesbare Fehlermeldungen.
        except APITimeoutError as e:
            raise LLMAPIError(
                "LLM request timed out (60 s). Please try again.",
                detail=str(e),
            )
        except RateLimitError as e:
            raise LLMAPIError(
                "LLM rate limit reached. Please wait a moment and try again.",
                detail=str(e),
            )
        except BadRequestError as e:
            raise LLMAPIError(
                f"LLM rejected the request: {e.message}",
                detail=str(e),
            )
        except APIError as e:
            raise LLMAPIError(
                f"LLM API error: {str(e)}",
                detail=str(e),
            )
        except Exception as e:
            raise LLMAPIError(
                "Unexpected LLM error.",
                detail=str(e),
            )


_default_llm_provider: LLMProvider = OpenAILLMProvider()


def get_default_llm_provider() -> LLMProvider:
    return _default_llm_provider
