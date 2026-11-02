"""
Unit-Tests für tests.fakes.fake_llm_provider.FakeLLMProvider

Geprüft werden Antwortreihenfolge, Prompt-Erfassung, Fehlerfälle und die
Austauschbarkeit mit dem Interface ``LLMProvider``. Es werden weder Datenbank
noch Netzwerk noch ein API-Key benötigt.
"""

import inspect
import socket

import pytest

from app.core.exceptions import LLMAPIError
from app.services.llm_provider import LLMProvider
from tests.fakes.fake_llm_provider import FakeLLMProvider


# ---------------------------------------------------------------------------
# Antwortreihenfolge und Determinismus
# ---------------------------------------------------------------------------

async def test_responses_are_returned_in_configured_order():
    fake = FakeLLMProvider(["a", "b", "c"])

    assert await fake.complete("p1") == "a"
    assert await fake.complete("p2") == "b"
    assert await fake.complete("p3") == "c"


async def test_add_response_appends_to_the_end_of_the_queue():
    fake = FakeLLMProvider(["a"])
    fake.add_response("b")

    assert await fake.complete("p1") == "a"
    assert await fake.complete("p2") == "b"


async def test_same_configuration_gives_identical_results():
    first = FakeLLMProvider(["a", "b"])
    second = FakeLLMProvider(["a", "b"])

    first_results = [await first.complete("p") for _ in range(2)]
    second_results = [await second.complete("p") for _ in range(2)]

    assert first_results == second_results


async def test_response_does_not_depend_on_prompt_content():
    fake = FakeLLMProvider(["a", "b"])

    assert await fake.complete("völlig anderer Text") == "a"
    assert await fake.complete("") == "b"


async def test_missing_response_raises_clear_error():
    fake = FakeLLMProvider(["a"])
    await fake.complete("p1")

    with pytest.raises(AssertionError, match="keine Antwort mehr"):
        await fake.complete("p2")


# ---------------------------------------------------------------------------
# Prompt-Erfassung
# ---------------------------------------------------------------------------

async def test_prompts_are_recorded_in_call_order():
    fake = FakeLLMProvider(["a", "b"])

    await fake.complete("p1")
    await fake.complete("p2")

    assert fake.prompts == ["p1", "p2"]
    assert fake.last_prompt() == "p2"
    assert fake.call_count == 2


def test_last_prompt_without_call_raises_assertion_error():
    fake = FakeLLMProvider()

    with pytest.raises(AssertionError, match="nicht aufgerufen"):
        fake.last_prompt()


async def test_reset_clears_prompts_and_pending_responses():
    fake = FakeLLMProvider(["a", "b"])
    await fake.complete("p1")

    fake.reset()

    assert fake.prompts == []
    assert fake.call_count == 0
    with pytest.raises(AssertionError, match="keine Antwort mehr"):
        await fake.complete("p2")


# ---------------------------------------------------------------------------
# Fehlerfälle
# ---------------------------------------------------------------------------

async def test_configured_failure_is_raised():
    fake = FakeLLMProvider()
    error = LLMAPIError("Rate limit")
    fake.set_failure(error)

    with pytest.raises(LLMAPIError) as exc_info:
        await fake.complete("p1")

    # Genau die konfigurierte Instanz, nicht eine neu erzeugte.
    assert exc_info.value is error


async def test_prompt_is_recorded_even_if_call_fails():
    fake = FakeLLMProvider()
    fake.set_failure(LLMAPIError("Timeout"))

    with pytest.raises(LLMAPIError):
        await fake.complete("p1")

    assert fake.prompts == ["p1"]
    assert fake.call_count == 1


async def test_failure_followed_by_success_simulates_a_retry():
    fake = FakeLLMProvider([LLMAPIError("Timeout"), "ok"])

    with pytest.raises(LLMAPIError):
        await fake.complete("p1")

    assert await fake.complete("p2") == "ok"
    assert fake.prompts == ["p1", "p2"]


async def test_failure_can_be_any_exception_type():
    fake = FakeLLMProvider()
    fake.set_failure(ValueError("prompt must not be empty"))

    with pytest.raises(ValueError, match="prompt must not be empty"):
        await fake.complete("")


# ---------------------------------------------------------------------------
# Austauschbarkeit mit dem produktiven Interface
# ---------------------------------------------------------------------------

async def test_fake_can_be_used_as_llm_provider():
    provider: LLMProvider = FakeLLMProvider(["hallo"])

    assert await provider.complete("Prompt") == "hallo"


def test_complete_signature_matches_the_protocol():
    # Das Protocol selbst wird bewusst nicht mit isinstance geprüft, da es nicht
    # runtime_checkable ist. Stattdessen wird die Signatur direkt verglichen.
    expected = inspect.signature(LLMProvider.complete)
    actual = inspect.signature(FakeLLMProvider.complete)

    assert list(actual.parameters) == list(expected.parameters)
    assert inspect.iscoroutinefunction(FakeLLMProvider.complete)


# ---------------------------------------------------------------------------
# Keine externen Zugriffe
# ---------------------------------------------------------------------------

async def test_fake_opens_no_network_connection(monkeypatch):
    def blocked(*args, **kwargs):
        pytest.fail("Der Fake darf keine Netzwerkverbindung öffnen.")

    monkeypatch.setattr(socket.socket, "connect", blocked)
    monkeypatch.setattr(socket.socket, "connect_ex", blocked)
    monkeypatch.setattr(socket, "getaddrinfo", blocked)

    fake = FakeLLMProvider(["a"])
    fake.set_failure(LLMAPIError("Fehler"))

    assert await fake.complete("p1") == "a"
    with pytest.raises(LLMAPIError):
        await fake.complete("p2")
