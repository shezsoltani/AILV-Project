import pytest
from fastapi.testclient import TestClient

from app.db import get_db


@pytest.fixture
def app(monkeypatch):
    for name, value in {
        "JWT_SECRET_KEY": "test-secret-not-for-production",
        "JWT_ALGORITHM": "HS256",
        "OPENAI_API_KEY": "",
        "SMTP_HOST": "smtp.example.invalid",
        "SMTP_PORT": "587",
        "SMTP_USER": "test",
        "SMTP_PASSWORD": "test",
        "MAIL_FROM": "tests@example.com",
    }.items():
        monkeypatch.setenv(name, value)

    # Erst nach der Testkonfiguration importieren.
    from app.main import app as application

    def no_database():
        pytest.fail("Für Datenbank-Endpunkte die Fixture 'client' verwenden.")

    previous = application.dependency_overrides.copy()
    application.dependency_overrides[get_db] = no_database
    try:
        yield application
    finally:
        application.dependency_overrides.clear()
        application.dependency_overrides.update(previous)


@pytest.fixture
def client(app, db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def smoke_client(app):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers():
    def _headers(user):
        from app.core.auth_utils import create_access_token
        token = create_access_token({'sub': str(user.id)})
        return {'Authorization': f'Bearer {token}'}
    return _headers
