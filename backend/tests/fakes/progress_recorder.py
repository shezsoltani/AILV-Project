"""
Test-Double für Fortschrittsmeldungen.

Die Background-Job- und Generierungs-Services melden ihren Fortschritt über
einen Callback mit der Signatur ``on_progress(progress: int, stage_label: str)``
(siehe ``app.services.generation.orchestrator.generate_questions`` und
``app.services.batch_runner.run_question_batches``). ``ProgressRecorder``
ersetzt diesen Callback in Tests und

  - speichert jede Meldung (Prozentwert + Text) in der Aufrufreihenfolge,
  - schreibt weder in die Datenbank noch ins Dateisystem,
  - stellt Assertion-Helfer für Reihenfolge, Prozentwert und Text bereit.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator, Optional


@dataclass(frozen=True)
class ProgressEvent:
    """Eine einzelne Fortschrittsmeldung."""

    progress: int
    message: str


class ProgressRecorder:
    """Test-Double für den ``on_progress``-Callback.

    Verwendung::

        recorder = ProgressRecorder()
        await generate_questions(req, db, user_id=uid, on_progress=recorder)

        recorder.assert_progress([33, 66, 100])
        recorder.assert_messages(["Grundstruktur wird erstellt", ...])
        recorder.assert_events([(33, "Grundstruktur wird erstellt"), ...])
    """

    def __init__(self) -> None:
        self.events: list[ProgressEvent] = []

    # ------------------------------------------------------------------
    # Callable-Schnittstelle (gleiche Signatur wie der echte Callback)
    # ------------------------------------------------------------------

    def __call__(self, progress: int, stage_label: str) -> None:
        """Speichert eine Meldung; Parameternamen entsprechen dem Produktionscode."""
        self.events.append(ProgressEvent(progress=progress, message=stage_label))

    # ------------------------------------------------------------------
    # Zugriff auf die aufgezeichneten Daten
    # ------------------------------------------------------------------

    @property
    def progress_values(self) -> list[int]:
        """Alle Prozentwerte in Aufrufreihenfolge."""
        return [event.progress for event in self.events]

    @property
    def messages(self) -> list[str]:
        """Alle Statusmeldungen in Aufrufreihenfolge."""
        return [event.message for event in self.events]

    @property
    def call_count(self) -> int:
        return len(self.events)

    def __len__(self) -> int:
        return len(self.events)

    def __bool__(self) -> bool:
        # Der Produktionscode prüft ``if on_progress:`` vor dem Aufruf. Ohne
        # diese Methode wäre ein leerer Recorder wegen ``__len__`` falsy und
        # würde nie aufgerufen.
        return True

    def __iter__(self) -> Iterator[ProgressEvent]:
        return iter(list(self.events))

    def __getitem__(self, index: int) -> ProgressEvent:
        return self.events[index]

    def reset(self) -> None:
        """Verwirft alle bisher aufgezeichneten Meldungen."""
        self.events.clear()

    # ------------------------------------------------------------------
    # Hilfs-Methoden für Assertions
    # ------------------------------------------------------------------

    def was_not_called(self) -> bool:
        """Gibt ``True`` zurück, wenn keine Meldung eingegangen ist."""
        return not self.events

    def last_event(self) -> ProgressEvent:
        """Gibt die zuletzt aufgezeichnete Meldung zurück.

        Raises:
            AssertionError: wenn noch keine Meldung eingegangen ist.
        """
        assert self.events, "Es wurde noch keine Fortschrittsmeldung aufgezeichnet."
        return self.events[-1]

    def assert_called(self, times: Optional[int] = None) -> None:
        """Prüft, dass mindestens eine (bzw. genau ``times``) Meldung(en) eingingen."""
        if times is None:
            assert self.events, "Es wurde keine Fortschrittsmeldung aufgezeichnet."
        else:
            assert len(self.events) == times, (
                f"Erwartet: {times} Fortschrittsmeldung(en), "
                f"erhalten: {len(self.events)} ({self.events!r})."
            )

    def assert_not_called(self) -> None:
        """Prüft, dass keine Fortschrittsmeldung eingegangen ist."""
        assert not self.events, (
            f"Es wurden unerwartet Fortschrittsmeldungen aufgezeichnet: {self.events!r}."
        )

    def assert_progress(self, expected: list[int]) -> None:
        """Prüft die Prozentwerte inklusive Reihenfolge."""
        assert self.progress_values == list(expected), (
            f"Prozentwerte abweichend. Erwartet: {list(expected)}, "
            f"erhalten: {self.progress_values}."
        )

    def assert_messages(self, expected: list[str]) -> None:
        """Prüft die Statusmeldungen inklusive Reihenfolge."""
        assert self.messages == list(expected), (
            f"Statusmeldungen abweichend. Erwartet: {list(expected)}, "
            f"erhalten: {self.messages}."
        )

    def assert_events(self, expected: list[tuple[int, str]]) -> None:
        """Prüft Paare ``(Prozentwert, Text)`` inklusive Reihenfolge."""
        actual = [(event.progress, event.message) for event in self.events]
        assert actual == [tuple(item) for item in expected], (
            f"Fortschrittsmeldungen abweichend. Erwartet: {list(expected)}, "
            f"erhalten: {actual}."
        )

    def assert_event(self, index: int, progress: int, message: str) -> None:
        """Prüft Prozentwert und Text der Meldung an Position ``index``."""
        assert -len(self.events) <= index < len(self.events), (
            f"Keine Meldung an Position {index} (aufgezeichnet: {len(self.events)})."
        )
        event = self.events[index]
        assert (event.progress, event.message) == (progress, message), (
            f"Meldung {index} abweichend. Erwartet: {(progress, message)}, "
            f"erhalten: {(event.progress, event.message)}."
        )

    def assert_progress_non_decreasing(self) -> None:
        """Prüft, dass die Prozentwerte nie sinken."""
        values = self.progress_values
        assert all(a <= b for a, b in zip(values, values[1:])), (
            f"Prozentwerte sinken: {values}."
        )

    def assert_progress_within_bounds(self, lower: int = 0, upper: int = 100) -> None:
        """Prüft, dass alle Prozentwerte im Bereich ``[lower, upper]`` liegen."""
        values = self.progress_values
        assert all(lower <= v <= upper for v in values), (
            f"Prozentwerte außerhalb von [{lower}, {upper}]: {values}."
        )
