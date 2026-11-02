"""
Unit-Tests für app.services.auth.auth_service

Der echte E-Mail-Versand wird durch FakeEmailSender ersetzt,
damit kein SMTP-Server kontaktiert wird.
"""

import pytest

from tests.fakes.fake_email_sender import FakeEmailSender


# ---------------------------------------------------------------------------
# Fixture: Fake für send_reset_email
# ---------------------------------------------------------------------------

@pytest.fixture
def fake_email(monkeypatch):
    """Ersetzt auth_service.send_reset_email durch FakeEmailSender."""
    fake = FakeEmailSender()
    monkeypatch.setattr(
        "app.services.auth.auth_service.send_reset_email",
        fake,
    )
    return fake


# ---------------------------------------------------------------------------
# request_password_reset – E-Mail wird korrekt versendet
# ---------------------------------------------------------------------------

async def test_request_password_reset_sends_email_to_correct_recipient(
    db_session, user_factory, fake_email
):
    """Eine Reset-E-Mail wird an die E-Mail-Adresse des Users gesendet."""
    from app.services.auth.auth_service import request_password_reset

    user = user_factory()
    await request_password_reset(db_session, user.email)

    assert fake_email.called_once(), "Es wurde nicht genau eine E-Mail gesendet."
    to, _token = fake_email.last_call()
    assert to == user.email


async def test_request_password_reset_token_is_passed_to_email(
    db_session, user_factory, fake_email
):
    """Der Token aus der Datenbank wird unverändert an send_reset_email übergeben."""
    from app.services.auth.auth_service import request_password_reset
    from app.models.sql_models import PasswordResetToken

    user = user_factory()
    await request_password_reset(db_session, user.email)

    _to, email_token = fake_email.last_call()

    db_token = (
        db_session.query(PasswordResetToken)
        .filter(PasswordResetToken.user_id == user.id)
        .first()
    )
    assert db_token is not None, "Kein Reset-Token in der Datenbank gefunden."
    assert email_token == db_token.token


# ---------------------------------------------------------------------------
# request_password_reset – unbekannte E-Mail-Adresse
# ---------------------------------------------------------------------------

async def test_request_password_reset_unknown_email_sends_no_email(
    db_session, fake_email
):
    """Bei unbekannter E-Mail wird keine E-Mail gesendet (kein User-Enumeration-Leak)."""
    from app.services.auth.auth_service import request_password_reset

    await request_password_reset(db_session, "nobody@example.invalid")

    assert fake_email.was_not_called(), "Es wurde eine E-Mail an eine unbekannte Adresse gesendet."


# ---------------------------------------------------------------------------
# request_password_reset – Fehler beim E-Mail-Versand
# ---------------------------------------------------------------------------

async def test_request_password_reset_email_failure_propagates(
    db_session, user_factory, fake_email
):
    """Ein Fehler im E-Mail-Versand wird nach oben weitergegeben."""
    from app.services.auth.auth_service import request_password_reset

    fake_email.set_failure(RuntimeError("SMTP nicht erreichbar"))
    user = user_factory()

    with pytest.raises(RuntimeError, match="SMTP nicht erreichbar"):
        await request_password_reset(db_session, user.email)
