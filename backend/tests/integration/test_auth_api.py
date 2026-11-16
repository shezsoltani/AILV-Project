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
