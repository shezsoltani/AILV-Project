"""
Unit-Tests für die Fragen-Validatoren.
Kein Datenbankzugriff, keine Netzwerkverbindung nötig.
"""

import pytest
from fastapi import HTTPException

from app.services.validators.request_validator import GenerateRequestValidator
from app.services.validators.content_validator import validate_content
from app.services.validators.skeleton_validator import validate_skeleton
from app.services.validators.improve_validator import validate_improve
from app.services.validators.custom_prompt_validator import (
    validate_custom_prompt,
    validate_custom_prompts_dict,
)
from app.core.exceptions import (
    ContentValidationError,
    ContextTextTooLongError,
    ImproveValidationError,
    SkeletonValidationError,
    TemplateRenderError,
)
from app.models.generate_models import GenerateRequest


def _req(**kw) -> GenerateRequest:
    return GenerateRequest(
        topic="Photosynthese",
        types=kw.pop("types", ["SCQ"]),
        difficulty_distribution=kw.pop("difficulty_distribution", {"easy": 50, "medium": 30, "hard": 20}),
        **kw,
    )


# ---------------------------------------------------------------------------
# GenerateRequestValidator
# ---------------------------------------------------------------------------

class TestGenerateRequestValidator:
    v = GenerateRequestValidator()

    def test_valid_request(self):
        self.v.validate(_req())

    def test_empty_types_raises(self):
        with pytest.raises(HTTPException) as exc:
            self.v.validate(_req(types=[]))
        assert exc.value.status_code == 422

    def test_unsupported_type_raises(self):
        with pytest.raises(HTTPException) as exc:
            self.v.validate(_req(types=["ESSAY"]))
        assert "ESSAY" in exc.value.detail

    def test_difficulty_not_100_raises(self):
        with pytest.raises(HTTPException) as exc:
            self.v.validate(_req(difficulty_distribution={"easy": 60, "medium": 30}))
        assert "100" in exc.value.detail

    def test_unknown_difficulty_key_raises(self):
        with pytest.raises(HTTPException) as exc:
            self.v.validate(_req(difficulty_distribution={"extreme": 100}))
        assert "extreme" in exc.value.detail

    def test_context_text_at_limit_passes(self):
        self.v.validate(_req(context_text="x" * 5000))

    def test_context_text_over_limit_raises(self):
        with pytest.raises(ContextTextTooLongError):
            self.v.validate(_req(context_text="x" * 5001))

    def test_invalid_custom_prompt_key_raises(self):
        with pytest.raises(TemplateRenderError):
            self.v.validate(_req(custom_prompts={"BAD_KEY": "x"}))


# ---------------------------------------------------------------------------
# validate_content
# ---------------------------------------------------------------------------

class TestContentValidator:

    def _scq(self, **kw):
        base = {"id": "1", "stem": "Frage?", "type": "SCQ", "difficulty": "easy",
                "choices": ["A", "B"], "correct_index": 0}
        base.update(kw)
        return base

    def test_valid_scq(self):
        validate_content([self._scq()], expected_count=1)

    def test_data_not_list_raises(self):
        with pytest.raises(ContentValidationError, match="JSON array"):
            validate_content({"not": "a list"}, expected_count=1)

    def test_wrong_count_raises(self):
        with pytest.raises(ContentValidationError, match="Expected 2"):
            validate_content([self._scq()], expected_count=2)

    def test_missing_field_raises(self):
        item = self._scq()
        del item["stem"]
        with pytest.raises(ContentValidationError, match="stem"):
            validate_content([item], expected_count=1)

    def test_invalid_type_raises(self):
        with pytest.raises(ContentValidationError, match="invalid type"):
            validate_content([self._scq(type="ESSAY")], expected_count=1)

    def test_scq_out_of_range_index_raises(self):
        with pytest.raises(ContentValidationError, match="invalid correct_index"):
            validate_content([self._scq(correct_index=99)], expected_count=1)

    def test_valid_mcq(self):
        item = {"id": "1", "stem": "Frage?", "type": "MCQ", "difficulty": "medium",
                "choices": ["A", "B", "C"], "correct_indices": [0, 2]}
        validate_content([item], expected_count=1)

    def test_mcq_with_correct_index_raises(self):
        item = {"id": "1", "stem": "Frage?", "type": "MCQ", "difficulty": "medium",
                "choices": ["A", "B"], "correct_index": 0}
        with pytest.raises(ContentValidationError, match="correct_indices"):
            validate_content([item], expected_count=1)

    def test_mcq_duplicate_index_raises(self):
        item = {"id": "1", "stem": "Frage?", "type": "MCQ", "difficulty": "medium",
                "choices": ["A", "B", "C"], "correct_indices": [0, 0]}
        with pytest.raises(ContentValidationError, match="duplicate"):
            validate_content([item], expected_count=1)

    def test_valid_short_answer(self):
        item = {"id": "1", "stem": "Erkläre.", "type": "SHORT_ANSWER", "difficulty": "hard"}
        validate_content([item], expected_count=1)

    def test_short_answer_with_correct_index_raises(self):
        item = {"id": "1", "stem": "Frage?", "type": "SHORT_ANSWER", "difficulty": "easy",
                "correct_index": 0}
        with pytest.raises(ContentValidationError, match="correct_index"):
            validate_content([item], expected_count=1)

    def test_valid_true_false(self):
        item = {"id": "1", "stem": "Stimmt das?", "type": "TRUE_FALSE", "difficulty": "easy",
                "choices": ["Wahr", "Falsch"], "correct_index": 0}
        validate_content([item], expected_count=1)

    def test_true_false_invalid_index_raises(self):
        item = {"id": "1", "stem": "Stimmt das?", "type": "TRUE_FALSE", "difficulty": "easy",
                "choices": ["Wahr", "Falsch"], "correct_index": 5}
        with pytest.raises(ContentValidationError, match="invalid correct_index"):
            validate_content([item], expected_count=1)


# ---------------------------------------------------------------------------
# validate_skeleton
# ---------------------------------------------------------------------------

class TestSkeletonValidator:

    def test_valid_skeleton(self):
        validate_skeleton([{"type": "SCQ", "difficulty": "easy"}], expected_count=1)

    def test_data_not_list_raises(self):
        with pytest.raises(SkeletonValidationError, match="JSON array"):
            validate_skeleton({"not": "a list"}, expected_count=1)

    def test_wrong_count_raises(self):
        with pytest.raises(SkeletonValidationError, match="Expected 2"):
            validate_skeleton([{"type": "SCQ", "difficulty": "easy"}], expected_count=2)

    def test_invalid_type_raises(self):
        with pytest.raises(SkeletonValidationError, match="invalid type"):
            validate_skeleton([{"type": "ESSAY", "difficulty": "easy"}], expected_count=1)

    def test_invalid_difficulty_raises(self):
        with pytest.raises(SkeletonValidationError, match="invalid difficulty"):
            validate_skeleton([{"type": "SCQ", "difficulty": "extreme"}], expected_count=1)

    @pytest.mark.parametrize("qtype", ["SCQ", "MCQ", "SHORT_ANSWER", "TRUE_FALSE"])
    def test_all_types_valid(self, qtype):
        validate_skeleton([{"type": qtype, "difficulty": "easy"}], expected_count=1)

    def test_skewed_distribution_raises(self):
        items = [{"type": "SCQ", "difficulty": "easy"}] * 3
        with pytest.raises(SkeletonValidationError, match="Difficulty"):
            validate_skeleton(items, expected_count=3, difficulty_distribution={"hard": 100})

    def test_distribution_skipped_for_small_batches(self):
        items = [{"type": "SCQ", "difficulty": "easy"}] * 2
        validate_skeleton(items, expected_count=2, difficulty_distribution={"hard": 100})


# ---------------------------------------------------------------------------
# validate_improve
# ---------------------------------------------------------------------------

class TestImproveValidator:

    def _orig(self):
        return {"id": "q1", "stem": "Alt?", "type": "SCQ", "difficulty": "easy",
                "choices": ["A", "B"], "correct_index": 0}

    def _new(self, **kw):
        base = {"id": "q1", "stem": "Neu?", "type": "SCQ", "difficulty": "easy",
                "choices": ["A", "B"], "correct_index": 0}
        base.update(kw)
        return base

    def test_valid_improve(self):
        validate_improve([self._new()], [self._orig()])

    def test_count_mismatch_raises(self):
        with pytest.raises(ImproveValidationError, match="same number"):
            validate_improve([self._new(), self._new()], [self._orig()])

    def test_type_change_raises(self):
        with pytest.raises(ImproveValidationError, match="type"):
            validate_improve([self._new(type="MCQ")], [self._orig()])

    def test_id_change_raises(self):
        with pytest.raises(ImproveValidationError, match="id"):
            validate_improve([self._new(id="andereId")], [self._orig()])

    def test_stem_not_string_raises(self):
        with pytest.raises(ImproveValidationError, match="stem"):
            validate_improve([self._new(stem=42)], [self._orig()])

    def test_correct_index_not_int_raises(self):
        with pytest.raises(ImproveValidationError, match="correct_index"):
            validate_improve([self._new(correct_index="0")], [self._orig()])

    def test_missing_key_after_improve_raises(self):
        new = self._new()
        del new["choices"]
        with pytest.raises(ImproveValidationError, match="missing keys"):
            validate_improve([new], [self._orig()])

    def test_mcq_correct_indices_not_list_raises(self):
        orig = {"id": "q1", "stem": "Alt?", "type": "MCQ", "difficulty": "easy",
                "choices": ["A", "B", "C"], "correct_indices": [0, 1]}
        new = {"id": "q1", "stem": "Neu?", "type": "MCQ", "difficulty": "easy",
               "choices": ["A", "B", "C"], "correct_indices": 0}
        with pytest.raises(ImproveValidationError, match="correct_indices"):
            validate_improve([new], [orig])


# ---------------------------------------------------------------------------
# validate_custom_prompt / validate_custom_prompts_dict
# ---------------------------------------------------------------------------

class TestCustomPromptValidator:

    def test_content_stage_with_placeholder_passes(self):
        validate_custom_prompt("CONTENT", "Hier: {{skeleton_data}}.")

    def test_content_stage_missing_placeholder_raises(self):
        with pytest.raises(TemplateRenderError) as exc:
            validate_custom_prompt("CONTENT", "Kein Platzhalter.")
        assert "{{skeleton_data}}" in exc.value.detail

    def test_improve_stage_missing_placeholder_raises(self):
        with pytest.raises(TemplateRenderError) as exc:
            validate_custom_prompt("IMPROVE", "Kein Platzhalter.")
        assert "{{questions_raw}}" in exc.value.detail

    def test_valid_dict_passes(self):
        validate_custom_prompts_dict({"SKELETON": "x", "CONTENT": "{{skeleton_data}}"})

    def test_unknown_key_raises(self):
        with pytest.raises(TemplateRenderError) as exc:
            validate_custom_prompts_dict({"GHOST": "x"})
        assert "GHOST" in exc.value.detail
