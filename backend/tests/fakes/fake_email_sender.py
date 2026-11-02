"""
Fake für den E-Mail-Versand.

Ersetzt ``app.core.email_utils.send_reset_email`` in Tests durch eine
In-Memory-Implementierung, die:
  - keinen SMTP-Server kontaktiert,
  - alle gesendeten Empfänger und Tokens aufzeichnet,
  - auf Wunsch einen Fehler wirft (um Fehlerverhalten zu testen).
"""

from __future__ import annotations

from typing import Optional


class FakeEmailSender:
    """Test-Double für ``send_reset_email``.

    Verwendung::

        fake = FakeEmailSender()
        monkeypatch.setattr("app.services.auth.auth_service.send_reset_email", fake)

        # Nach dem Aufruf:
        assert fake.called_once()
        to, token = fake.last_call()
    """

    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []
        self._raise: Optional[Exception] = None

    # ------------------------------------------------------------------
    # Konfigurations-Helfer
    # ------------------------------------------------------------------

    def set_failure(self, exc: Exception) -> None:
        """Lässt den nächsten (und alle weiteren) Aufrufe mit *exc* fehlschlagen."""
        self._raise = exc

    def reset(self) -> None:
        """Setzt Aufzeichnungen und konfigurierte Fehler zurück."""
        self.calls.clear()
        self._raise = None

    # ------------------------------------------------------------------
    # Callable-Schnittstelle (gleiche Signatur wie das Original)
    # ------------------------------------------------------------------

    async def __call__(self, to: str, token: str) -> None:  # noqa: D401
        """Simuliert den Versand; speichert Empfänger und Token."""
        if self._raise is not None:
            raise self._raise
        self.calls.append((to, token))

    # ------------------------------------------------------------------
    # Hilfs-Methoden für Assertions
    # ------------------------------------------------------------------

    def called_once(self) -> bool:
        """Gibt ``True`` zurück, wenn genau ein E-Mail-Versand stattgefunden hat."""
        return len(self.calls) == 1

    def last_call(self) -> tuple[str, str]:
        """Gibt ``(to, token)`` des letzten Aufrufs zurück.

        Raises:
            AssertionError: wenn noch kein Aufruf stattgefunden hat.
        """
        assert self.calls, "send_reset_email wurde nicht aufgerufen."
        return self.calls[-1]

    def was_not_called(self) -> bool:
        """Gibt ``True`` zurück, wenn kein E-Mail-Versand stattgefunden hat."""
        return len(self.calls) == 0
