"""Authentication through real routes and JWT validation in the isolated database."""

from datetime import timedelta
from uuid import UUID

import pytest
from sqlalchemy import select

from app.models.sql_models import User


@pytest.fixture
def registration_data(test_password):
    return {
        "username": "auth_api_user",
        "email": "auth_api_user@example.com",
        "password": test_password,
    }


def test_register_login_and_access_archive(
    client, db_session, registration_data, finalized_archive_factory,
):
    response = client.post("/api/auth/register", json=registration_data)
    assert response.status_code == 200
    registered = response.json()
    assert registered["username"] == registration_data["username"]
    assert registered["email"] == registration_data["email"]
    assert "password" not in registered
    assert "password_hash" not in registered

    user = db_session.get(User, UUID(registered["id"]))
    assert user is not None
    assert user.password_hash != registration_data["password"]

    response = client.post("/api/auth/login", json={
        "username": registration_data["username"],
        "password": registration_data["password"],
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    assert token
    assert response.json()["token_type"] == "bearer"
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/archive/topics", headers=headers)
    assert response.status_code == 200
    assert response.json() == {"topics": []}

    archive = finalized_archive_factory(user, topic="Geschütztes SQL-Archiv")
    response = client.get("/api/archive/topics", headers=headers)
    assert response.status_code == 200
    assert [topic["request_id"] for topic in response.json()["topics"]] == [
        str(archive["request_id"]),
    ]


@pytest.mark.parametrize("duplicate_field, error_code", [
    ("username", "auth_username_exists"),
    ("email", "auth_email_exists"),
])
def test_duplicate_registration_does_not_create_user(
    client, db_session, registration_data, duplicate_field, error_code,
):
    response = client.post("/api/auth/register", json=registration_data)
    assert response.status_code == 200
    original_id = UUID(response.json()["id"])

    duplicate = {
        **registration_data,
        "username": "another_auth_user",
        "email": "another_auth_user@example.com",
    }
    duplicate[duplicate_field] = registration_data[duplicate_field]
    response = client.post("/api/auth/register", json=duplicate)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == error_code
    assert "access_token" not in response.json()

    db_session.expire_all()
    users = db_session.scalars(select(User)).all()
    assert len(users) == 1
    assert users[0].id == original_id
    assert users[0].username == registration_data["username"]
    assert users[0].email == registration_data["email"]


def test_registration_with_too_short_password_does_not_create_user(
    client, db_session, registration_data,
):
    response = client.post(
        "/api/auth/register", json={**registration_data, "password": "a" * 7},
    )
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "password"]
    assert db_session.scalars(select(User)).all() == []


def test_registration_accepts_password_with_minimum_length(client, registration_data):
    response = client.post(
        "/api/auth/register", json={**registration_data, "password": "a" * 8},
    )
    assert response.status_code == 200


@pytest.mark.parametrize("failure", ["wrong_password", "unknown_username"])
def test_invalid_login_returns_no_access_token(
    client, test_user, test_password, failure,
):
    credentials = {"username": test_user.username, "password": test_password}
    if failure == "wrong_password":
        credentials["password"] = "Definitely-Wrong-Password!"
    else:
        credentials["username"] = "unknown_auth_api_user"

    response = client.post("/api/auth/login", json=credentials)
    assert response.status_code == 401
    assert response.json() == {"detail": {
        "message": "Invalid username or password",
        "code": "auth_invalid_credentials",
    }}
    assert "access_token" not in response.json()


@pytest.mark.parametrize("token_case, expected_status, detail", [
    ("missing", 403, "Not authenticated"),
    ("tampered", 401, "Invalid authentication"),
    ("expired", 401, "Invalid authentication"),
])
def test_archive_rejects_invalid_authentication_without_leaking_data(
    client, test_user, test_password, finalized_archive_factory,
    token_case, expected_status, detail,
):
    # Import after the client fixture has installed the test configuration.
    from app.core.auth_utils import create_access_token

    topic = "Vertraulicher Archivinhalt"
    archive = finalized_archive_factory(test_user, topic=topic)
    login = client.post("/api/auth/login", json={
        "username": test_user.username,
        "password": test_password,
    })
    assert login.status_code == 200
    valid_token = login.json()["access_token"]
    response = client.get(
        "/api/archive/topics", headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert response.status_code == 200
    assert response.json()["topics"][0]["request_id"] == str(archive["request_id"])

    headers = {}
    if token_case == "tampered":
        # Change significant signature bits, leaving header and payload intact.
        header, payload, signature = valid_token.split(".")
        replacement = "A" if signature[0] != "A" else "B"
        token = f"{header}.{payload}.{replacement}{signature[1:]}"
        headers = {"Authorization": f"Bearer {token}"}
    elif token_case == "expired":
        # Correctly signed for an existing user, but already expired; no sleep.
        token = create_access_token(
            {"sub": str(test_user.id)}, expires_delta=timedelta(minutes=-1),
        )
        headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/archive/topics", headers=headers)
    assert response.status_code == expected_status
    assert response.json() == {"detail": detail}
    assert "topics" not in response.json()
    assert topic not in response.text
    assert str(archive["request_id"]) not in response.text


def login(client, username, password, headers=None):
    return client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
        headers=headers,
    )


@pytest.fixture
def fake_time(monkeypatch):
    now = [1000.0]
    monkeypatch.setattr("app.core.rate_limiter.clock", lambda: now[0])
    return now


def test_login_is_blocked_until_window_expires(
    client, test_user, test_password, fake_time,
):
    from app.config import settings

    for _ in range(settings.login_rate_limit_per_user):
        assert login(client, test_user.username, "wrong").status_code == 401

    response = login(client, test_user.username, test_password)
    assert response.status_code == 429
    assert response.json()["detail"]["code"] == "auth_rate_limited"
    assert response.headers["retry-after"] == str(settings.rate_limit_window_seconds)

    fake_time[0] += settings.rate_limit_window_seconds
    assert login(client, test_user.username, test_password).status_code == 200


def test_successful_login_resets_failed_attempts(client, test_user, test_password):
    from app.config import settings

    for _ in range(3):
        for _ in range(settings.login_rate_limit_per_user - 1):
            assert login(client, test_user.username, "wrong").status_code == 401
        assert login(client, test_user.username, test_password).status_code == 200


def test_login_limit_per_ip_covers_different_usernames(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "login_rate_limit_per_ip", 3)

    for number in range(3):
        assert login(client, f"user{number}", "wrong").status_code == 401
    assert login(client, "another_user", "wrong").status_code == 429


@pytest.mark.parametrize("trust_proxy, expected_status", [(True, 401), (False, 429)])
def test_real_ip_header_only_counts_behind_proxy(
    client, monkeypatch, trust_proxy, expected_status,
):
    from app.config import settings

    monkeypatch.setattr(settings, "trust_proxy_headers", trust_proxy)
    monkeypatch.setattr(settings, "login_rate_limit_per_ip", 1)

    assert login(client, "someone", "wrong", {"X-Real-IP": "10.0.0.1"}).status_code == 401
    response = login(client, "someone", "wrong", {"X-Real-IP": "10.0.0.2"})
    assert response.status_code == expected_status


@pytest.mark.parametrize("path, body, limit_name, normal_status", [
    (
        "/api/auth/forgot-password",
        {"email": "nobody@example.com"},
        "forgot_password_rate_limit_per_email",
        200,
    ),
    (
        "/api/auth/reset-password",
        {"token": "invalid", "new_password": "a" * 8},
        "reset_password_rate_limit_per_ip",
        400,
    ),
])
def test_password_reset_is_blocked_until_window_expires(
    client, fake_time, path, body, limit_name, normal_status,
):
    from app.config import settings

    for _ in range(getattr(settings, limit_name)):
        assert client.post(path, json=body).status_code == normal_status
    assert client.post(path, json=body).status_code == 429

    fake_time[0] += settings.rate_limit_window_seconds
    assert client.post(path, json=body).status_code == normal_status
