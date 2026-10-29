"""Local Ollama connection implementing LLMProvider.complete(prompt)."""

import asyncio

import httpx

from ..core.exceptions import LLMAPIError


class OllamaLLMProvider:
    def __init__(
        self,
        base_url: str,
        model: str,
        timeout_seconds: float = 120.0,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if not model.strip():
            raise ValueError("model must not be empty")
        if timeout_seconds <= 0:
            raise ValueError("timeout_seconds must be positive")
        self.base_url = base_url.rstrip("/")
        self.model = model.strip()
        self.timeout_seconds = timeout_seconds
        self._transport = transport

    async def complete(self, prompt: str) -> str:
        prompt = prompt.strip()
        if not prompt:
            raise ValueError("prompt must not be empty")

        try:
            # Bound the entire request, including waiting for a busy local model.
            async with asyncio.timeout(self.timeout_seconds):
                async with httpx.AsyncClient(
                    timeout=self.timeout_seconds, transport=self._transport,
                ) as client:
                    response = await client.post(
                        f"{self.base_url}/api/generate",
                        json={
                            "model": self.model,
                            "prompt": prompt,
                            "system": "You are a helpful assistant that returns only the requested output format.",
                            "stream": False,
                            "think": False,
                            "keep_alive": "5m",
                            "options": {"temperature": 0.7},
                        },
                    )
        except (TimeoutError, httpx.TimeoutException) as exc:
            raise LLMAPIError(
                f"Ollama hat nicht innerhalb von {self.timeout_seconds:g} Sekunden geantwortet."
            ) from exc
        except httpx.RequestError as exc:
            raise LLMAPIError(
                "Ollama ist nicht erreichbar. Bitte den Dienst und die konfigurierte Adresse prüfen."
            ) from exc

        if response.status_code == 404:
            raise LLMAPIError(
                f"Ollama-Modell '{self.model}' oder API-Endpunkt nicht gefunden. "
                "Bitte Modellinstallation und konfigurierte Adresse prüfen."
            )
        if not response.is_success:
            raise LLMAPIError(f"Ollama meldet einen Fehler (HTTP {response.status_code}).")

        try:
            data = response.json()
        except ValueError as exc:
            raise LLMAPIError("Ollama hat eine ungültige API-Antwort geliefert.") from exc
        if not isinstance(data, dict) or data.get("error") or data.get("done") is not True:
            raise LLMAPIError("Ollama hat keine erfolgreich abgeschlossene Antwort geliefert.")
        content = data.get("response")
        if not isinstance(content, str) or not content.strip():
            raise LLMAPIError("Ollama hat einen leeren oder ungültigen Antworttext geliefert.")
        return content.strip()
