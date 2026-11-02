"""
Unit-Tests für app.services.batch_runner._compute_batches und
app.services.batch_runner._custom_prompts_for_batch.

Geprüft werden Batch-Aufteilung für alle relevanten Mengen sowie das Verhalten
von Custom Prompts bei einem oder mehreren Batches. Es werden weder Datenbank
noch LLM noch Netzwerk benötigt.
"""

import pytest

from app.services.batch_runner import (
    BATCH_SIZE,
    _compute_batches,
    _custom_prompts_for_batch,
)


# ---------------------------------------------------------------------------
# _compute_batches – Batch-Aufteilung
# ---------------------------------------------------------------------------

class TestComputeBatches:
    """Testet _compute_batches(total) für alle relevanten Mengen."""

    # --- Summe entspricht immer der angeforderten Gesamtmenge ---

    def test_sum_equals_total_for_small_amount(self):
        total = BATCH_SIZE - 1
        assert sum(_compute_batches(total)) == total

    def test_sum_equals_total_for_exact_batch_size(self):
        assert sum(_compute_batches(BATCH_SIZE)) == BATCH_SIZE

    def test_sum_equals_total_for_just_above_batch_size(self):
        total = BATCH_SIZE + 1
        assert sum(_compute_batches(total)) == total

    def test_sum_equals_total_for_two_full_batches(self):
        total = BATCH_SIZE * 2
        assert sum(_compute_batches(total)) == total

    def test_sum_equals_total_for_two_full_batches_with_remainder(self):
        total = BATCH_SIZE * 2 + 3
        assert sum(_compute_batches(total)) == total

    def test_sum_equals_total_for_large_amount(self):
        total = BATCH_SIZE * 5 + 7
        assert sum(_compute_batches(total)) == total

    # --- Kein Batch überschreitet BATCH_SIZE ---

    def test_no_batch_exceeds_batch_size_for_small_amount(self):
        assert all(b <= BATCH_SIZE for b in _compute_batches(BATCH_SIZE - 1))

    def test_no_batch_exceeds_batch_size_for_exact_batch_size(self):
        assert all(b <= BATCH_SIZE for b in _compute_batches(BATCH_SIZE))

    def test_no_batch_exceeds_batch_size_for_multiple_full_batches(self):
        assert all(b <= BATCH_SIZE for b in _compute_batches(BATCH_SIZE * 3))

    def test_no_batch_exceeds_batch_size_with_remainder(self):
        assert all(b <= BATCH_SIZE for b in _compute_batches(BATCH_SIZE * 2 + 5))

    # --- Anzahl der Batches ---

    def test_single_batch_for_amount_below_batch_size(self):
        assert len(_compute_batches(1)) == 1
        assert len(_compute_batches(BATCH_SIZE - 1)) == 1

    def test_single_batch_for_exact_batch_size(self):
        assert len(_compute_batches(BATCH_SIZE)) == 1

    def test_two_batches_for_just_above_batch_size(self):
        assert len(_compute_batches(BATCH_SIZE + 1)) == 2

    def test_two_batches_for_two_full_batches(self):
        assert len(_compute_batches(BATCH_SIZE * 2)) == 2

    def test_three_batches_for_two_full_batches_with_remainder(self):
        assert len(_compute_batches(BATCH_SIZE * 2 + 1)) == 3

    # --- Batchgrößen ---

    def test_small_amount_produces_single_batch_with_correct_size(self):
        total = BATCH_SIZE - 3
        batches = _compute_batches(total)
        assert batches == [total]

    def test_exact_batch_size_produces_single_full_batch(self):
        assert _compute_batches(BATCH_SIZE) == [BATCH_SIZE]

    def test_just_above_batch_size_splits_into_full_and_remainder(self):
        batches = _compute_batches(BATCH_SIZE + 1)
        assert batches[0] == BATCH_SIZE
        assert batches[1] == 1

    def test_two_full_batches_have_correct_sizes(self):
        assert _compute_batches(BATCH_SIZE * 2) == [BATCH_SIZE, BATCH_SIZE]

    def test_two_full_batches_with_remainder_have_correct_sizes(self):
        remainder = 3
        batches = _compute_batches(BATCH_SIZE * 2 + remainder)
        assert batches[:2] == [BATCH_SIZE, BATCH_SIZE]
        assert batches[2] == remainder

    def test_remainder_is_last_batch(self):
        remainder = BATCH_SIZE - 1
        batches = _compute_batches(BATCH_SIZE + remainder)
        assert batches[-1] == remainder

    def test_batches_returns_list_type(self):
        assert isinstance(_compute_batches(BATCH_SIZE), list)

    def test_single_item_total(self):
        assert _compute_batches(1) == [1]

    # --- BATCH_SIZE wird aus dem Modul gelesen, nicht hartcodiert ---

    def test_batch_size_constant_is_used_for_splitting(self):
        """Sichert, dass die Tests auf BATCH_SIZE basieren, nicht auf dem Wert 10."""
        batches = _compute_batches(BATCH_SIZE)
        assert len(batches) == 1
        assert batches[0] == BATCH_SIZE

        batches = _compute_batches(BATCH_SIZE + 1)
        assert len(batches) == 2


# ---------------------------------------------------------------------------
# _custom_prompts_for_batch – Custom-Prompt-Behandlung
# ---------------------------------------------------------------------------

class TestCustomPromptsForBatch:
    """Testet _custom_prompts_for_batch() für Fragen (SKELETON / {{count}})."""

    STAGE = "SKELETON"
    PLACEHOLDER = "{{count}}"

    def _call(self, custom_prompts, batch_total):
        return _custom_prompts_for_batch(
            custom_prompts,
            batch_total=batch_total,
            stage=self.STAGE,
            count_placeholder=self.PLACEHOLDER,
        )

    # --- Kein Custom Prompt übergeben ---

    def test_none_returns_none_for_single_batch(self):
        assert self._call(None, batch_total=1) is None

    def test_none_returns_none_for_multiple_batches(self):
        assert self._call(None, batch_total=3) is None

    def test_empty_dict_returns_empty_dict_for_single_batch(self):
        result = self._call({}, batch_total=1)
        assert result == {}

    def test_empty_dict_returns_empty_dict_for_multiple_batches(self):
        result = self._call({}, batch_total=3)
        assert result == {}

    # --- Ein einzelner Batch (batch_total == 1) ---

    def test_prompt_without_placeholder_is_kept_for_single_batch(self):
        prompts = {self.STAGE: "Erstelle Fragen zum Thema {{topic}}."}
        result = self._call(prompts, batch_total=1)
        assert result is prompts

    def test_prompt_with_placeholder_is_kept_for_single_batch(self):
        prompts = {self.STAGE: f"Erstelle {self.PLACEHOLDER} Fragen."}
        result = self._call(prompts, batch_total=1)
        assert result is prompts

    def test_other_stages_are_untouched_for_single_batch(self):
        prompts = {"CONTENT": "Schreibe Inhalte.", self.STAGE: "x"}
        result = self._call(prompts, batch_total=1)
        assert result["CONTENT"] == "Schreibe Inhalte."

    # --- Mehrere Batches: Prompt mit Platzhalter bleibt erhalten ---

    def test_prompt_with_placeholder_is_kept_for_multiple_batches(self):
        prompts = {self.STAGE: f"Erstelle {self.PLACEHOLDER} Fragen zum Thema {{{{topic}}}}."}
        result = self._call(prompts, batch_total=2)
        assert result[self.STAGE] == prompts[self.STAGE]

    def test_prompt_with_placeholder_returns_same_dict_for_multiple_batches(self):
        prompts = {self.STAGE: f"Thema {{{{topic}}}}, Anzahl {self.PLACEHOLDER}."}
        result = self._call(prompts, batch_total=3)
        assert result is prompts

    def test_other_stage_without_placeholder_stays_in_multi_batch(self):
        """Nur der betroffene Stage-Schlüssel wird entfernt, nicht andere."""
        prompts = {
            self.STAGE: f"Anzahl {self.PLACEHOLDER}.",
            "CONTENT": "Inhalte ohne Platzhalter.",
        }
        result = self._call(prompts, batch_total=2)
        assert "CONTENT" in result
        assert result["CONTENT"] == "Inhalte ohne Platzhalter."

    # --- Mehrere Batches: Prompt ohne Platzhalter wird entfernt ---

    def test_prompt_without_placeholder_is_removed_for_multiple_batches(self):
        prompts = {self.STAGE: "Erstelle Fragen zum Thema {{topic}}."}
        result = self._call(prompts, batch_total=2)
        assert self.STAGE not in result

    def test_prompt_without_placeholder_removal_preserves_other_stages(self):
        prompts = {
            self.STAGE: "Kein Platzhalter.",
            "CONTENT": "Inhalte.",
            "IMPROVE": "Verbessern.",
        }
        result = self._call(prompts, batch_total=2)
        assert self.STAGE not in result
        assert result["CONTENT"] == "Inhalte."
        assert result["IMPROVE"] == "Verbessern."

    def test_removal_returns_new_dict_not_original(self):
        """Das Eingabe-Dict wird nicht verändert."""
        prompts = {self.STAGE: "Kein Platzhalter."}
        result = self._call(prompts, batch_total=2)
        assert result is not prompts

    # --- Eingabedaten werden nicht verändert ---

    def test_original_dict_is_not_mutated_when_stage_is_removed(self):
        prompts = {self.STAGE: "Kein Platzhalter.", "CONTENT": "Inhalte."}
        original_keys = set(prompts.keys())
        self._call(prompts, batch_total=2)
        assert set(prompts.keys()) == original_keys

    def test_original_dict_is_not_mutated_when_prompt_is_kept(self):
        prompts = {self.STAGE: f"Anzahl {self.PLACEHOLDER}.", "CONTENT": "Inhalte."}
        original = dict(prompts)
        self._call(prompts, batch_total=2)
        assert prompts == original

    def test_original_dict_is_not_mutated_for_single_batch(self):
        prompts = {self.STAGE: "Kein Platzhalter."}
        original = dict(prompts)
        self._call(prompts, batch_total=1)
        assert prompts == original

    # --- Stage nicht im Dict vorhanden ---

    def test_missing_stage_key_returns_same_dict_for_multiple_batches(self):
        prompts = {"CONTENT": "Inhalte."}
        result = self._call(prompts, batch_total=3)
        assert result is prompts

    def test_missing_stage_key_for_single_batch_returns_same_dict(self):
        prompts = {"CONTENT": "Inhalte."}
        result = self._call(prompts, batch_total=1)
        assert result is prompts

    # --- Randfall: batch_total == 1 ignoriert den Platzhalter-Check ---

    def test_batch_total_one_never_removes_prompt(self):
        prompts = {self.STAGE: "Ohne Platzhalter, aber batch_total=1."}
        result = self._call(prompts, batch_total=1)
        assert self.STAGE in result


class TestCustomPromptsForBatchSlides:
    """Testet _custom_prompts_for_batch() für Folien (SLIDES_OUTLINE / {{slide_count}})."""

    STAGE = "SLIDES_OUTLINE"
    PLACEHOLDER = "{{slide_count}}"

    def _call(self, custom_prompts, batch_total):
        return _custom_prompts_for_batch(
            custom_prompts,
            batch_total=batch_total,
            stage=self.STAGE,
            count_placeholder=self.PLACEHOLDER,
        )

    def test_prompt_with_placeholder_is_kept_for_multiple_batches(self):
        prompts = {self.STAGE: f"Erstelle {self.PLACEHOLDER} Folien."}
        result = self._call(prompts, batch_total=2)
        assert self.STAGE in result

    def test_prompt_without_placeholder_is_removed_for_multiple_batches(self):
        prompts = {self.STAGE: "Erstelle Folien zum Thema {{topic}}."}
        result = self._call(prompts, batch_total=2)
        assert self.STAGE not in result

    def test_original_dict_is_not_mutated(self):
        prompts = {self.STAGE: "Kein Platzhalter."}
        original = dict(prompts)
        self._call(prompts, batch_total=2)
        assert prompts == original

    def test_single_batch_keeps_prompt_without_placeholder(self):
        prompts = {self.STAGE: "Ohne Platzhalter."}
        result = self._call(prompts, batch_total=1)
        assert self.STAGE in result
