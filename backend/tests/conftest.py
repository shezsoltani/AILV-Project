import os
import re
import shutil
from contextlib import contextmanager
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.exc import ArgumentError
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool
from sqlalchemy.schema import CreateSchema

from app.db import DATABASE_URL
from app.models.base import Base
from app.models import sql_models

pytest_plugins = [
    "fixtures.application",
    "fixtures.data",
]

_test_dialects = set()

@event.listens_for(Engine, "do_connect")
def _guard_database_connections(dialect, connection_record, args, kwargs):
    if dialect not in _test_dialects:
        raise RuntimeError(
            "Zugriff auf die Datenbank gesperrt: In Tests darf nur die Test-Datenbank benutzt werden. Setze TEST_DATABASE_URL und nutze db_session."
        )

def _validate_test_database_url(value, regular_url):
    if not value or not value.strip():
        raise ValueError("TEST_DATABASE_URL ist nicht gesetzt.")
    try:
        url = make_url(value)
        regular = make_url(regular_url)
        # Accessing port also validates malformed port values.
        url.port
    except (ArgumentError, ValueError, TypeError):
        raise ValueError("Die Datenbank-URL ist ungültig.") from None
    if url.drivername not in {"postgresql", "postgresql+psycopg2"}:
        raise ValueError("Die Test-Datenbank muss PostgreSQL mit psycopg2 verwenden.")
    if not url.database or not re.fullmatch(r"[a-zA-Z0-9_]+_test", url.database):
        raise ValueError("Der Name der Test-Datenbank muss auf _test enden.")
    if url.database.casefold() == (regular.database or "").casefold():
        raise ValueError("Test-Datenbank und normale Datenbank müssen unterschiedliche Namen haben.")
    if set(url.query) - {"sslmode", "sslrootcert", "sslcert", "sslkey", "connect_timeout"}:
        raise ValueError("Diese Zusatz-Parameter in TEST_DATABASE_URL sind nicht erlaubt.")
    if not url.host or not url.username:
        raise ValueError("TEST_DATABASE_URL braucht einen Host und einen Benutzernamen.")
    return url


@pytest.fixture(scope="session")
def test_database_url():
    value = os.environ.get("TEST_DATABASE_URL")
    if not value or not value.strip():
        pytest.skip("TEST_DATABASE_URL ist nicht gesetzt, daher werden die Datenbank-Tests übersprungen.")
    try:
        return _validate_test_database_url(value, DATABASE_URL)
    except ValueError as error:
        pytest.fail(str(error), pytrace=False)


@pytest.fixture(scope="session")
def db_connection(test_database_url):
    engine = create_engine(
        test_database_url, poolclass=NullPool, connect_args={"connect_timeout": 5}
    )
    _test_dialects.add(engine.dialect)
    try:
        with engine.connect() as connection:
            with connection.begin() as transaction:
                schema = "pytest_" + uuid4().hex
                connection.execute(CreateSchema(schema))
                # No public fallback: even unqualified SQL uses only our schema.
                connection.exec_driver_sql(f'SET LOCAL search_path TO "{schema}"')
                connection = connection.execution_options(
                    schema_translate_map={None: schema}
                )
                Base.metadata.create_all(connection)
                try:
                    yield connection
                finally:
                    transaction.rollback()
    finally:
        _test_dialects.discard(engine.dialect)
        engine.dispose()


@contextmanager
def _isolated_session(connection):
    # This savepoint survives Session.commit()/rollback(). The Session manages
    # its own nested savepoints inside it (SQLAlchemy 2.x).
    transaction = connection.begin_nested()
    try:
        with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
            yield session
    finally:
        transaction.rollback()


@pytest.fixture
def db_session(db_connection):
    with _isolated_session(db_connection) as session:
        yield session


@pytest.fixture
def tmp_path(tmp_path):
    """Überschreibt die eingebaute Fixture: Testdateien werden nach jedem Test entfernt.

    Pytest löscht ``tmp_path`` standardmäßig erst Sitzungen später und behält
    Verzeichnisse fehlgeschlagener Tests. Hier wird das Verzeichnis nach jedem
    Test sofort entfernt, auch bei Fehlschlägen. Dateitests verwenden
    ausschließlich diese Fixture (keine absoluten oder produktiven Pfade).
    """
    yield tmp_path
    shutil.rmtree(tmp_path, ignore_errors=True)
