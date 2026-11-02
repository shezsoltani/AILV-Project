"""
Fake für die LLM-Schnittstelle.

Ersetzt den produktiven Provider (``app.services.llm_client.OpenAILLMProvider``)
in Tests durch eine In-Memory-Implementierung, die:
  - keine Netzwerkverbindung und keinen API-Key benötigt,
  - vordefinierte Antworten in fester Reihenfolge zurückgibt,
  - auf Wunsch definierte Exceptions auslöst,
  - alle übergebenen Prompts für spätere Assertions speichert.

Dieses Modul importiert bewusst weder ``llm_client`` noch ``config``:
``app.config`` verlangt beim Import gesetzte Umgebungsvariablen (JWT, SMTP),
die in reinen Unit-Tests nicht vorhanden sind.
"""

from __future__ import annotations

from collections import deque
from typing import Iterable, Union

# Ein Eintrag der Antwort-Queue: entweder der Rückgabetext oder eine Exception,
# die beim passenden Aufruf ausgelöst wird.
Response = Union[str, Exception]


class FakeLLMProvider:
    """Test-Double für das Protocol ``LLMProvider``.

    Das Protocol verlangt nur ``async def complete(self, prompt: str) -> str``.
    Der Fake erfüllt es strukturell (Duck Typing), eine Vererbung ist nicht nötig.

    Verwendung::

        fake = FakeLLMProvider(["erste Antwort", "zweite Antwort"])
        fake.set_failure(LLMAPIError("Rate limit"))  # dritter Aufruf schlägt fehl

        assert await fake.complete("Prompt") == "erste Antwort"
        assert fake.last_prompt() == "Prompt"
    """

    def __init__(self, responses: Iterable[Response] = ()) -> None:
        self.prompts: list[str] = []
        self._responses: deque[Response] = deque(responses)

    # ------------------------------------------------------------------
    # Konfigurations-Helfer
    # ------------------------------------------------------------------

    def add_response(self, response: str) -> None:
        """Reiht eine weitere Antwort am Ende der Queue ein."""
        self._responses.append(response)

    def set_failure(self, exc: Exception) -> None:
        """Reiht eine Exception am Ende der Queue ein.

        Sie wird beim Aufruf ausgelöst, an dem sie an der Reihe ist. Dadurch
        lassen sich Abläufe wie "erst Fehler, dann Erfolg" (Retry) abbilden.
        """
        self._responses.append(exc)

    def reset(self) -> None:
        """Entfernt gespeicherte Prompts und alle noch offenen Antworten."""
        self.prompts.clear()
        self._responses.clear()

    # ------------------------------------------------------------------
    # Interface von LLMProvider
    # ------------------------------------------------------------------

    async def complete(self, prompt: str) -> str:
        """Speichert den Prompt und liefert die nächste konfigurierte Antwort."""
        # Der Prompt wird zuerst gespeichert, damit er auch dann prüfbar ist,
        # wenn der Aufruf anschließend mit einer Exception endet.
        self.prompts.append(prompt)

        # Keine Standardantwort erfinden: Ein vergessener Eintrag soll im Test
        # sofort auffallen und das Ergebnis nicht still verfälschen.
        if not self._responses:
            raise AssertionError(
                "FakeLLMProvider: keine Antwort mehr konfiguriert "
                f"(Aufruf {self.call_count})."
            )

        response = self._responses.popleft()
        if isinstance(response, Exception):
            raise response
        return response

    # ------------------------------------------------------------------
    # Hilfs-Methoden für Assertions
    # ------------------------------------------------------------------

    @property
    def call_count(self) -> int:
        """Anzahl der Aufrufe von ``complete``, auch der fehlgeschlagenen."""
        return len(self.prompts)

    def last_prompt(self) -> str:
        """Gibt den zuletzt übergebenen Prompt zurück.

        Raises:
            AssertionError: wenn ``complete`` noch nicht aufgerufen wurde.
        """
        assert self.prompts, "FakeLLMProvider.complete wurde nicht aufgerufen."
        return self.prompts[-1]
