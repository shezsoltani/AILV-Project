"""Resolve a server-approved provider separately for each question job."""

import httpx
from fastapi import HTTPException

from ..config import settings
from ..models.generate_models import GenerateRequest
from .llm_client import OpenAILLMProvider
from .llm_provider import LLMProvider
from .ollama_provider import OllamaLLMProvider


def resolve_selection(req: GenerateRequest) -> GenerateRequest:
    if req.provider == "openai":
        allowed = (settings.openai_model_name,)
    elif req.provider == "ollama" and settings.ollama_enabled:
        allowed = settings.ollama_models
    else:
        raise HTTPException(422, "Dieser KI-Anbieter ist auf diesem Server nicht freigegeben.")
    model = req.model if req.model is not None else (allowed[0] if allowed else None)
    if not model or model not in allowed:
        raise HTTPException(422, "Dieses Modell ist auf diesem Server nicht freigegeben.")
    return req.model_copy(update={"model": model})


def create_provider(req: GenerateRequest) -> LLMProvider:
    selected = resolve_selection(req)
    if selected.provider == "ollama":
        return OllamaLLMProvider(
            settings.ollama_base_url, selected.model,
            settings.ollama_timeout_seconds,
        )
    return OpenAILLMProvider(model=selected.model)


async def available_models() -> dict:
    models = [{"provider": "openai", "model": settings.openai_model_name,
               "available": bool(settings.openai_api_key),
               "reason": None if settings.openai_api_key else "OpenAI-Key fehlt."}]
    if settings.ollama_enabled:
        installed = set()
        reason = None
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(f"{settings.ollama_base_url}/api/tags")
                response.raise_for_status()
                installed = {entry["name"] for entry in response.json()["models"]}
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            reason = "Ollama ist nicht erreichbar oder meldet eine ungültige Modellliste."
        for model in settings.ollama_models:
            found = model in installed or (":" not in model and f"{model}:latest" in installed)
            models.append({"provider": "ollama", "model": model,
                           "available": reason is None and found,
                           "reason": reason or (None if found else "Modell ist nicht installiert.")})
    return {"models": models}
