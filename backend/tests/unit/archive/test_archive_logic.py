"""Unit-Tests für die Archive-Geschäftslogik.

Abgedeckte Module
-----------------
- archive_read_service   : get_all_finalized_topics, get_questions_for_request
- archive_update_service : update_questions_for_request
- archive_delete_service : delete_archive_entry
- slides_archive_service : list_user_decks, get_deck_with_slides, remove_deck, modify_deck

Strategie
---------
Repository-Funktionen werden via unittest.mock.patch ersetzt, damit
kein echter Datenbankzugriff stattfindet.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.core.exceptions import ArchiveNotFoundError, ArchiveServiceError
from app.models.archive_models import ArchiveQuestionUpdate
from app.services.archive.archive_read_service import (
    get_all_finalized_topics,
    get_questions_for_request,
)
from app.services.archive.archive_update_service import update_questions_for_request
from app.services.archive.archive_delete_service import delete_archive_entry
from app.services.archive.slides_archive_service import (
    get_deck_with_slides,
    list_user_decks,
    modify_deck,
    remove_deck,
)


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

import datetime as _dt

def _make_request(user_id=None):
    r = SimpleNamespace()
    r.id = uuid4()
    r.user_id = user_id or uuid4()
    r.topic = "Datenbanken"
    r.language = "de"
    r.types = ["SCQ"]
    r.created_at = _dt.datetime(2024, 1, 1, tzinfo=_dt.timezone.utc)
    return r


def _make_question(request_id, qtype="SCQ"):
    q = SimpleNamespace()
    q.id = uuid4()
    q.request_id = request_id
    q.type = qtype
    q.stem = "Was ist SQL?"
    q.difficulty = "easy"
    q.choices = ["A", "B", "C", "D"]
    q.correct_index = 0
    q.correct_indices = None
    q.answer = None
    q.rationale = "SQL ist eine Abfragesprache."
    return q


def _make_user(user_id=None):
    u = SimpleNamespace()
    u.id = user_id or uuid4()
    return u


def _make_update(question_id, qtype="SCQ", **overrides):
    defaults = dict(
        id=question_id,
        question="Was ist SQL?",
        difficulty="easy",
        choices=["A", "B", "C", "D"],
        correct_index=0,
        correct_indices=None,
        answer=None,
        rationale="Korrekt.",
    )
    defaults.update(overrides)
    return ArchiveQuestionUpdate(**defaults)


def _make_slide(position=1):
    s = SimpleNamespace()
    s.id = uuid4()
    s.position = position
    s.slide_type = "content"
    s.title = f"Folie {position}"
    s.bullets = ["Punkt 1"]
    s.examples = []
    s.created_at = None
    return s


def _make_deck(user_id=None):
    d = SimpleNamespace()
    d.id = uuid4()
    d.request_id = uuid4()
    d.user_id = user_id or uuid4()
    d.name = "Test Deck"
    d.created_at = None
    d.slides = [_make_slide(1), _make_slide(2)]
    return d


# ---------------------------------------------------------------------------
# Tests – archive_read_service.get_all_finalized_topics
# ---------------------------------------------------------------------------

class TestGetAllFinalizedTopics:

    def test_returns_topics_for_user(self):
        """Gibt alle Themen des Benutzers zurück."""
        req = _make_request()
        user_id = uuid4()
        # get_all_finalized_topics baut die Query selbst – wir mocken db.query
        db = MagicMock()
        # Simuliere das Ergebnis der gruppierten Query: [(GenerationRequest, count, finalized_at)]
        import datetime
        fake_row = (req, 3, datetime.datetime(2024, 1, 1))
        (
            db.query.return_value
            .join.return_value
            .filter.return_value
            .group_by.return_value
            .order_by.return_value
            .all.return_value
        ) = [fake_row]

        result = get_all_finalized_topics(db, user_id)

        assert len(result.topics) == 1
        assert result.topics[0].topic == "Datenbanken"
        assert result.topics[0].question_count == 3

    def test_returns_empty_list_when_no_topics(self):
        """Leeres Ergebnis liefert leere Topics-Liste."""
        db = MagicMock()
        (
            db.query.return_value
            .join.return_value
            .filter.return_value
            .group_by.return_value
            .order_by.return_value
            .all.return_value
        ) = []

        result = get_all_finalized_topics(db, uuid4())

        assert result.topics == []

    def test_wraps_db_exception_in_archive_service_error(self):
        """DB-Fehler wird in ArchiveServiceError gewrappt."""
        db = MagicMock()
        db.query.side_effect = RuntimeError("Verbindung getrennt")

        with pytest.raises(ArchiveServiceError):
            get_all_finalized_topics(db, uuid4())


# ---------------------------------------------------------------------------
# Tests – archive_read_service.get_questions_for_request
# ---------------------------------------------------------------------------

class TestGetQuestionsForRequest:

    def test_returns_response_when_request_and_questions_exist(self):
        req = _make_request()
        q = _make_question(req.id)

        with patch(
            "app.services.archive.archive_read_service.get_archive_questions",
            return_value=(req, [q]),
        ):
            result = get_questions_for_request(MagicMock(), req.id)

        assert str(result.request_id) == str(req.id)
        assert result.topic == "Datenbanken"
        assert len(result.questions) == 1

    def test_raises_not_found_when_request_missing(self):
        with patch(
            "app.services.archive.archive_read_service.get_archive_questions",
            return_value=(None, []),
        ):
            with pytest.raises(ArchiveNotFoundError):
                get_questions_for_request(MagicMock(), uuid4())

    def test_raises_not_found_when_no_questions(self):
        req = _make_request()
        with patch(
            "app.services.archive.archive_read_service.get_archive_questions",
            return_value=(req, []),
        ):
            with pytest.raises(ArchiveNotFoundError):
                get_questions_for_request(MagicMock(), req.id)

    def test_wraps_unexpected_exception_in_archive_service_error(self):
        with patch(
            "app.services.archive.archive_read_service.get_archive_questions",
            side_effect=RuntimeError("DB explodiert"),
        ):
            with pytest.raises(ArchiveServiceError):
                get_questions_for_request(MagicMock(), uuid4())


# ---------------------------------------------------------------------------
# Tests – archive_update_service.update_questions_for_request
# ---------------------------------------------------------------------------

class TestUpdateQuestionsForRequest:

    def _run_update(self, gen_request, questions, updates, db=None):
        db = db or MagicMock()
        with patch(
            "app.services.archive.archive_update_service.get_questions_by_request_id",
            side_effect=[questions, questions],  # einmal vor, einmal nach Update
        ):
            with patch("app.services.archive.archive_update_service.update_archive_questions"):
                return update_questions_for_request(db, gen_request, updates)

    # --- Erfolgsfall SCQ ---
    def test_scq_update_succeeds(self):
        req = _make_request()
        q = _make_question(req.id, qtype="SCQ")
        update = _make_update(q.id, qtype="SCQ")
        result = self._run_update(req, [q], [update])
        assert str(result.request_id) == str(req.id)

    # --- Erfolgsfall MCQ ---
    def test_mcq_update_succeeds(self):
        req = _make_request()
        q = _make_question(req.id, qtype="MCQ")
        update = _make_update(
            q.id, qtype="MCQ",
            choices=["A", "B", "C"],
            correct_index=None,
            correct_indices=[0, 1],
        )
        result = self._run_update(req, [q], [update])
        assert result is not None

    # --- Erfolgsfall TRUE_FALSE ---
    def test_true_false_update_succeeds(self):
        req = _make_request()
        q = _make_question(req.id, qtype="TRUE_FALSE")
        update = _make_update(
            q.id, qtype="TRUE_FALSE",
            choices=["Wahr", "Falsch"],
            correct_index=0,
        )
        result = self._run_update(req, [q], [update])
        assert result is not None

    # --- Erfolgsfall SHORT_ANSWER ---
    def test_short_answer_update_succeeds(self):
        req = _make_request()
        q = _make_question(req.id, qtype="SHORT_ANSWER")
        update = _make_update(
            q.id, qtype="SHORT_ANSWER",
            choices=None,
            correct_index=None,
            answer="SQL ist eine Abfragesprache.",
        )
        result = self._run_update(req, [q], [update])
        assert result is not None

    # --- Keine Fragen gefunden ---
    def test_raises_not_found_when_no_questions(self):
        req = _make_request()
        db = MagicMock()
        with patch(
            "app.services.archive.archive_update_service.get_questions_by_request_id",
            return_value=[],
        ):
            with pytest.raises(ArchiveNotFoundError):
                update_questions_for_request(db, req, [])

    # --- Falsche Frage-ID ---
    def test_raises_404_for_unknown_question_id(self):
        req = _make_request()
        q = _make_question(req.id, qtype="SCQ")
        unknown_update = _make_update(uuid4(), qtype="SCQ")  # andere ID
        db = MagicMock()
        with patch(
            "app.services.archive.archive_update_service.get_questions_by_request_id",
            return_value=[q],
        ):
            with pytest.raises(HTTPException) as exc:
                update_questions_for_request(db, req, [unknown_update])
        assert exc.value.status_code == 404

    # --- SCQ: fehlende choices ---
    def test_scq_raises_400_when_choices_missing(self):
        req = _make_request()
        q = _make_question(req.id, qtype="SCQ")
        update = _make_update(q.id, qtype="SCQ", choices=None, correct_index=0)
        db = MagicMock()
        with patch(
            "app.services.archive.archive_update_service.get_questions_by_request_id",
            return_value=[q],
        ):
            with pytest.raises(HTTPException) as exc:
                update_questions_for_request(db, req, [update])
        assert exc.value.status_code == 400

    # --- SCQ: choices mit leerem String ---
    def test_scq_raises_400_when_choice_is_empty_string(self):
        req = _make_request()
        q = _make_question(req.id, qtype="SCQ")
        update = _make_update(q.id, qtype="SCQ", choices=["A", "  ", "C", "D"], correct_index=0)
        db = MagicMock()
        with patch(
            "app.services.archive.archive_update_service.get_questions_by_request_id",
            return_value=[q],
        ):
            with pytest.raises(HTTPException) as exc:
                update_questions_for_request(db, req, [update])
        assert exc.value.status_code == 400

    # --- SCQ: ungültiger correct_index ---
    def test_scq_raises_400_when_correct_index_out_of_bounds(self):
        req = _make_request()
        q = _make_question(req.id, qtype="SCQ")
        update = _make_update(q.id, qtype="SCQ", choices=["A", "B"], correct_index=5)
        db = MagicMock()
        with patch(
            "app.services.archive.archive_update_service.get_questions_by_request_id",
            return_value=[q],
        ):
            with pytest.raises(HTTPException) as exc:
                update_questions_for_request(db, req, [update])
        assert exc.value.status_code == 400

    # --- MCQ: fehlende correct_indices ---
    def test_mcq_raises_400_when_correct_indices_missing(self):
        req = _make_request()
        q = _make_question(req.id, qtype="MCQ")
        update = _make_update(
            q.id, qtype="MCQ",
            choices=["A", "B", "C"],
            correct_index=None,
            correct_indices=None,
        )
        db = MagicMock()
        with patch(
            "app.services.archive.archive_update_service.get_questions_by_request_id",
            return_value=[q],
        ):
            with pytest.raises(HTTPException) as exc:
                update_questions_for_request(db, req, [update])
        assert exc.value.status_code == 400

    # --- MCQ: correct_indices out of bounds ---
    def test_mcq_raises_400_when_correct_indices_out_of_bounds(self):
        req = _make_request()
        q = _make_question(req.id, qtype="MCQ")
        update = _make_update(
            q.id, qtype="MCQ",
            choices=["A", "B"],
            correct_index=None,
            correct_indices=[0, 99],
        )
        db = MagicMock()
        with patch(
            "app.services.archive.archive_update_service.get_questions_by_request_id",
            return_value=[q],
        ):
            with pytest.raises(HTTPException) as exc:
                update_questions_for_request(db, req, [update])
        assert exc.value.status_code == 400

    # --- SHORT_ANSWER: leere Antwort ---
    def test_short_answer_raises_400_when_answer_empty(self):
        req = _make_request()
        q = _make_question(req.id, qtype="SHORT_ANSWER")
        update = _make_update(
            q.id, qtype="SHORT_ANSWER",
            choices=None,
            correct_index=None,
            answer="   ",  # nur Leerzeichen
        )
        db = MagicMock()
        with patch(
            "app.services.archive.archive_update_service.get_questions_by_request_id",
            return_value=[q],
        ):
            with pytest.raises(HTTPException) as exc:
                update_questions_for_request(db, req, [update])
        assert exc.value.status_code == 400

    # --- Persistenzfehler → Rollback ---
    def test_db_error_triggers_rollback(self):
        req = _make_request()
        q = _make_question(req.id, qtype="SCQ")
        update = _make_update(q.id, qtype="SCQ")
        db = MagicMock()
        db.commit.side_effect = RuntimeError("DB-Verbindung unterbrochen")

        with patch(
            "app.services.archive.archive_update_service.get_questions_by_request_id",
            return_value=[q],
        ):
            with patch("app.services.archive.archive_update_service.update_archive_questions"):
                with pytest.raises(ArchiveServiceError):
                    update_questions_for_request(db, req, [update])

        db.rollback.assert_called_once()


# ---------------------------------------------------------------------------
# Tests – archive_delete_service.delete_archive_entry
# ---------------------------------------------------------------------------

class TestDeleteArchiveEntry:

    def test_owner_can_delete_own_entry(self):
        user = _make_user()
        req = _make_request(user_id=user.id)

        with patch(
            "app.services.archive.archive_delete_service.get_generation_request_by_id",
            return_value=req,
        ):
            with patch(
                "app.services.archive.archive_delete_service.delete_generation_request",
            ) as mock_delete:
                result = delete_archive_entry(MagicMock(), req.id, user)

        assert result["success"] is True
        mock_delete.assert_called_once()

    def test_raises_404_when_entry_not_found(self):
        with patch(
            "app.services.archive.archive_delete_service.get_generation_request_by_id",
            return_value=None,
        ):
            with pytest.raises(HTTPException) as exc:
                delete_archive_entry(MagicMock(), uuid4(), _make_user())
        assert exc.value.status_code == 404

    def test_raises_403_when_user_is_not_owner(self):
        owner = _make_user()
        other_user = _make_user()
        req = _make_request(user_id=owner.id)

        with patch(
            "app.services.archive.archive_delete_service.get_generation_request_by_id",
            return_value=req,
        ):
            with pytest.raises(HTTPException) as exc:
                delete_archive_entry(MagicMock(), req.id, other_user)
        assert exc.value.status_code == 403

    def test_delete_not_called_when_not_owner(self):
        owner = _make_user()
        other_user = _make_user()
        req = _make_request(user_id=owner.id)

        with patch(
            "app.services.archive.archive_delete_service.get_generation_request_by_id",
            return_value=req,
        ):
            with patch(
                "app.services.archive.archive_delete_service.delete_generation_request",
            ) as mock_delete:
                with pytest.raises(HTTPException):
                    delete_archive_entry(MagicMock(), req.id, other_user)

        mock_delete.assert_not_called()


# ---------------------------------------------------------------------------
# Tests – slides_archive_service (Folien-Archiv)
# ---------------------------------------------------------------------------

class TestSlidesArchiveService:

    # --- list_user_decks ---

    def test_list_user_decks_returns_all_decks(self):
        """Gibt alle Decks eines Benutzers zurück."""
        deck1 = _make_deck()
        deck2 = _make_deck()
        user_id = uuid4()

        with patch(
            "app.services.archive.slides_archive_service.get_slide_decks_by_user",
            return_value=[deck1, deck2],
        ):
            result = list_user_decks(MagicMock(), user_id)

        assert len(result.decks) == 2

    def test_list_user_decks_returns_empty_when_none(self):
        """Leeres Ergebnis → leere Deck-Liste."""
        with patch(
            "app.services.archive.slides_archive_service.get_slide_decks_by_user",
            return_value=[],
        ):
            result = list_user_decks(MagicMock(), uuid4())

        assert result.decks == []

    def test_list_user_decks_includes_slide_count(self):
        """slide_count entspricht der Anzahl Folien im Deck."""
        deck = _make_deck()  # hat 2 Slides
        with patch(
            "app.services.archive.slides_archive_service.get_slide_decks_by_user",
            return_value=[deck],
        ):
            result = list_user_decks(MagicMock(), uuid4())

        assert result.decks[0].slide_count == 2

    # --- get_deck_with_slides ---

    def test_get_deck_with_slides_returns_detail(self):
        deck = _make_deck()
        with patch(
            "app.services.archive.slides_archive_service.get_slide_deck_by_id",
            return_value=deck,
        ):
            result = get_deck_with_slides(MagicMock(), deck.id, deck.user_id)

        assert str(result.id) == str(deck.id)
        assert len(result.slides) == 2

    def test_get_deck_raises_404_when_not_found(self):
        with patch(
            "app.services.archive.slides_archive_service.get_slide_deck_by_id",
            return_value=None,
        ):
            with pytest.raises(HTTPException) as exc:
                get_deck_with_slides(MagicMock(), uuid4(), uuid4())
        assert exc.value.status_code == 404

    # --- remove_deck ---

    def test_remove_deck_succeeds(self):
        deck_id = uuid4()
        with patch(
            "app.services.archive.slides_archive_service.delete_slide_deck",
            return_value=True,
        ):
            result = remove_deck(MagicMock(), deck_id, uuid4())

        assert result.success is True
        assert str(result.deck_id) == str(deck_id)

    def test_remove_deck_raises_404_when_not_found(self):
        with patch(
            "app.services.archive.slides_archive_service.delete_slide_deck",
            return_value=None,
        ):
            with pytest.raises(HTTPException) as exc:
                remove_deck(MagicMock(), uuid4(), uuid4())
        assert exc.value.status_code == 404

    # --- modify_deck ---

    def test_modify_deck_returns_updated_detail(self):
        """Erfolgreiche Änderung liefert aktualisierte DeckDetailResponse."""
        deck = _make_deck()
        slides_data = [{"title": "Neue Folie", "position": 1}]

        with patch(
            "app.services.archive.slides_archive_service.update_slide_deck_slides",
            return_value=deck,
        ):
            result = modify_deck(MagicMock(), deck.id, deck.user_id, slides_data)

        assert str(result.id) == str(deck.id)
        assert len(result.slides) == 2

    def test_modify_deck_raises_404_when_deck_not_found(self):
        """Deck nicht gefunden → 404."""
        with patch(
            "app.services.archive.slides_archive_service.update_slide_deck_slides",
            return_value=None,
        ):
            with pytest.raises(HTTPException) as exc:
                modify_deck(MagicMock(), uuid4(), uuid4(), [])
        assert exc.value.status_code == 404
