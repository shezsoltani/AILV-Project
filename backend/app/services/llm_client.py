# app/services/llm_client.py
import logging
from openai import AsyncOpenAI
from openai import APIError
from ..config import settings

# Versuche spezifische Exception-Klassen zu importieren (falls verfügbar)
try:
    from openai import RateLimitError, APITimeoutError, BadRequestError
except ImportError:
    RateLimitError = None
    APITimeoutError = None
    BadRequestError = None

logger = logging.getLogger(__name__)


class LLMAPIError(Exception):
    """Exception für Fehler bei LLM-API-Aufrufen."""
    
    def __init__(self, status_code: int | None, message: str, detail: str | None = None):
        self.status_code = status_code
        self.message = message
        self.detail = detail
        super().__init__(self.message)
    
    def __str__(self) -> str:
        if self.status_code:
            base = f"LLM API Error (HTTP {self.status_code}): {self.message}"
        else:
            base = f"LLM API Error: {self.message}"
        
        if self.detail:
            return f"{base} - {self.detail}"
        return base


async def call_llm(prompt: str) -> str:
    """
    Ruft die LLM-API auf und gibt die Response zurück.
    
    Args:
        prompt: Der Prompt-Text, der an die LLM-API gesendet wird.
    
    Returns:
        Die generierte Response als String.
    
    Raises:
        ValueError: Wenn der Prompt leer ist.
        LLMAPIError: Wenn die API-Key fehlt oder ein API-Fehler auftritt.
    """
    # Prompt trimmen
    prompt = prompt.strip()
    
    # Leere Prompt-Prüfung
    if not prompt:
        raise ValueError("prompt must not be empty")
    
    # API-Key-Prüfung
    if not settings.openai_api_key:
        raise LLMAPIError(
            status_code=None,
            message="OPENAI_API_KEY missing",
            detail=None
        )
    
    # OpenAI Client erstellen
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    prompt_len = len(prompt)
    
    try:
        # Chat-Completion aufrufen
        resp = await client.chat.completions.create(
            model=settings.openai_model_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that returns only the requested output format."},
                {"role": "user", "content": prompt}
            ]
        )
        
        # Guard: Prüfe auf leere Response
        if not resp.choices:
            raise LLMAPIError(
                status_code=None,
                message="LLM returned empty response",
                detail=None
            )
        
        content = resp.choices[0].message.content
        if not content:
            raise LLMAPIError(
                status_code=None,
                message="LLM returned empty response",
                detail=None
            )
        
        # Response-Text extrahieren
        return content.strip()
    
    except LLMAPIError:
        # LLMAPIError direkt durchreichen (z.B. leere Response)
        raise
    except Exception as e:
        # Status-Code extrahieren (falls vorhanden)
        status_code = getattr(e, "status_code", None)
        
        # Fehlertyp bestimmen und auf LLMAPIError mappen
        if APITimeoutError and isinstance(e, APITimeoutError):
            error = LLMAPIError(
                status_code=None,
                message="LLM request timed out",
                detail=str(e)
            )
            logger.error(
                f"LLM timeout error (prompt_len={prompt_len}): {error}"
            )
            raise error
        
        elif RateLimitError and isinstance(e, RateLimitError):
            error = LLMAPIError(
                status_code=429,
                message="LLM rate limit exceeded",
                detail=str(e)
            )
            logger.error(
                f"LLM rate limit error (status_code=429, prompt_len={prompt_len}): {error}"
            )
            raise error
        
        elif BadRequestError and isinstance(e, BadRequestError):
            error = LLMAPIError(
                status_code=400,
                message="LLM invalid request",
                detail=str(e)
            )
            logger.error(
                f"LLM invalid request error (status_code=400, prompt_len={prompt_len}): {error}"
            )
            raise error
        
        elif isinstance(e, APIError):
            # Generische APIError - prüfe Status-Code
            if status_code:
                if 500 <= status_code < 600:
                    # 5xx Server-Fehler
                    error = LLMAPIError(
                        status_code=502,
                        message="LLM upstream error",
                        detail=str(e)
                    )
                    logger.error(
                        f"LLM upstream error (status_code={status_code}, prompt_len={prompt_len}): {error}"
                    )
                    raise error
                elif status_code == 429:
                    # Rate Limit (falls RateLimitError nicht verfügbar)
                    error = LLMAPIError(
                        status_code=429,
                        message="LLM rate limit exceeded",
                        detail=str(e)
                    )
                    logger.error(
                        f"LLM rate limit error (status_code=429, prompt_len={prompt_len}): {error}"
                    )
                    raise error
                elif status_code == 400:
                    # Bad Request (falls BadRequestError nicht verfügbar)
                    error = LLMAPIError(
                        status_code=400,
                        message="LLM invalid request",
                        detail=str(e)
                    )
                    logger.error(
                        f"LLM invalid request error (status_code=400, prompt_len={prompt_len}): {error}"
                    )
                    raise error
        
        # Sonstige Fehler (inkl. generische Exception)
        error = LLMAPIError(
            status_code=status_code,
            message="LLM API error",
            detail=str(e)
        )
        logger.exception(
            f"LLM API error (status_code={status_code}, prompt_len={prompt_len}, error_type={type(e).__name__}): {error}"
        )
        raise error

# NOTE: All OpenAI calls must go through call_llm().
