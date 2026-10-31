"""
Fake Session Factory – Test-Double für SessionLocal.

Verwendung in Tests:
    from unittest.mock import MagicMock
    from tests.fakes.fake_session_factory import FakeSessionFactory

    db = MagicMock()
    factory = FakeSessionFactory(db)

    await run_questions_job(
        ...,
        session_factory=factory,
    )

    # factory.session ist die übergebene Mock-Session
    db.close.assert_called_once()
"""


class FakeSessionFactory:
    """Gibt bei jedem Aufruf dieselbe vorkonfigurierte Session zurück.

    Damit können Tests eine MagicMock-Session übergeben und sicherstellen,
    dass kein echter Datenbankzugriff stattfindet.
    """

    def __init__(self, session) -> None:
        self.session = session

    def __call__(self):
        """Imitiert den Aufruf von SessionLocal()."""
        return self.session
