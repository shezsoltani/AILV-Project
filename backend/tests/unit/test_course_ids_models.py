"""SCRUM-43: Feld course_ids in den Anfragemodellen für Generieren und Speichern.

Keine Datenbank, kein LLM, kein Netzwerk.
"""

from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from app.models.finalization_models import FinalizeQuestionsRequest
from app.models.generate_models import GenerateRequest
from app.services.batch_runner import BATCH_SIZE, _compute_batches


def _generate_request(**overrides):
    values = {"topic": "Relationale Datenbanken", "count": 2}
    values.update(overrides)
    return GenerateRequest(**values)


class TestGenerateRequestCourseIds:
    def test_missing_field_means_empty_list(self):
        assert _generate_request().course_ids == []

    def test_empty_list_is_allowed(self):
        assert _generate_request(course_ids=[]).course_ids == []

    def test_accepts_uuid_strings(self):
        course_id = uuid4()
        req = _generate_request(course_ids=[str(course_id)])
        assert req.course_ids == [course_id]
        assert isinstance(req.course_ids[0], UUID)

    def test_removes_duplicates_and_keeps_order(self):
        first, second = uuid4(), uuid4()
        req = _generate_request(
            course_ids=[str(second), str(first), str(second), str(first)]
        )
        assert req.course_ids == [second, first]

    @pytest.mark.parametrize("value", [None, "abc", ["keine-uuid"], [None], 5])
    def test_rejects_invalid_values(self, value):
        with pytest.raises(ValidationError):
            _generate_request(course_ids=value)

    def test_survives_storage_as_job_input(self):
        """Der Job speichert die Anfrage als JSON und baut sie daraus wieder auf."""
        first, second = uuid4(), uuid4()
        req = _generate_request(course_ids=[first, second])

        stored = req.model_dump(mode="json")
        assert stored["course_ids"] == [str(first), str(second)]

        restored = GenerateRequest(**stored)
        assert restored.course_ids == [first, second]

    def test_selection_is_kept_for_every_batch(self):
        """batch_runner erzeugt je Batch eine Kopie mit geänderter Anzahl."""
        first, second = uuid4(), uuid4()
        req = _generate_request(count=BATCH_SIZE * 2 + 3, course_ids=[first, second])

        batch_requests = [
            req.model_copy(update={"count": size}) for size in _compute_batches(req.count)
        ]

        assert len(batch_requests) == 3
        assert all(batch.course_ids == [first, second] for batch in batch_requests)

    def test_other_defaults_are_unchanged(self):
        req = _generate_request()
        assert req.provider == "openai"
        assert req.types == ["SCQ"]
        assert req.custom_prompts is None


class TestFinalizeRequestCourseIds:
    def _request(self, **overrides):
        values = {
            "request_id": str(uuid4()),
            "questions": [{"generated_question_id": str(uuid4())}],
        }
        values.update(overrides)
        return FinalizeQuestionsRequest(**values)

    def test_missing_field_means_empty_list(self):
        assert self._request().course_ids == []

    def test_removes_duplicates_and_keeps_order(self):
        first, second = uuid4(), uuid4()
        req = self._request(course_ids=[str(first), str(second), str(first)])
        assert req.course_ids == [first, second]

    @pytest.mark.parametrize("value", [None, "abc", ["keine-uuid"], [None]])
    def test_rejects_invalid_values(self, value):
        with pytest.raises(ValidationError):
            self._request(course_ids=value)
