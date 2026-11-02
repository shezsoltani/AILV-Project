"""Unit-Tests für den PDF-Export (T8.3).

Geprüft werden leere und befüllte Fragensammlungen, Öffnen der PDF-Bytes
sowie Thema und wesentliche Frageinhalte. Es wird kein pixelgenaues Layout
geprüft. Exporte bleiben im Speicher (kein Schreiben ins Projektverzeichnis).
"""

from __future__ import annotations

import io
from pathlib import Path

import fitz
import pytest

from app.services.pdf_export_service import (
    build_questions_pdf,
    build_questions_pdf_exam,
)

TOPIC = "Relationale Datenbanken"


def _scq(**overrides) -> dict:
    base = {
        "type": "SCQ",
        "stem": "Was ist ein Primaerschluessel?",
        "difficulty": "easy",
        "choices": ["Eindeutiger Schluessel", "Fremdschluessel", "Index", "View"],
        "correct_index": 0,
        "rationale": "Er identifiziert eine Zeile eindeutig.",
    }
    base.update(overrides)
    return base


def _mcq(**overrides) -> dict:
    base = {
        "type": "MCQ",
        "stem": "Welche sind relationale Operatoren?",
        "difficulty": "medium",
        "choices": ["Selektion", "Projektion", "Schleife", "Join"],
        "correct_indices": [0, 1, 3],
        "rationale": "Selektion, Projektion und Join sind relational.",
    }
    base.update(overrides)
    return base


def _short_answer(**overrides) -> dict:
    base = {
        "type": "SHORT_ANSWER",
        "stem": "Wie heisst die Abfragesprache?",
        "difficulty": "hard",
        "answer": "SQL",
        "rationale": "Structured Query Language.",
    }
    base.update(overrides)
    return base


def _true_false(**overrides) -> dict:
    base = {
        "type": "TRUE_FALSE",
        "stem": "Jeder Fremdschluessel muss auf einen Primaerschluessel verweisen.",
        "difficulty": "easy",
        "choices": ["TRUE", "FALSE"],
        "correct_index": 0,
    }
    base.update(overrides)
    return base


def _pdf_text(pdf_bytes: bytes) -> str:
    """Öffnet PDF-Bytes mit PyMuPDF und liefert den gesamten Text."""
    assert pdf_bytes.startswith(b"%PDF"), "Keine gültige PDF-Signatur"
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        return "\n".join(page.get_text() for page in doc)
    finally:
        doc.close()


def _assert_openable(pdf_bytes: bytes) -> int:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        assert doc.page_count >= 1
        return doc.page_count
    finally:
        doc.close()


# ---------------------------------------------------------------------------
# Leere und befüllte Sammlungen
# ---------------------------------------------------------------------------


class TestPdfEmptyAndFilled:
    def test_empty_collection_produces_openable_pdf(self):
        pdf_bytes = build_questions_pdf([], TOPIC)
        assert isinstance(pdf_bytes, (bytes, bytearray))
        pages = _assert_openable(pdf_bytes)
        text = _pdf_text(pdf_bytes)
        assert "Fragenkatalog" in text
        assert TOPIC in text
        # Nur Titelseite, keine Fragen
        assert pages == 1
        assert "Frage 1" not in text

    def test_filled_collection_contains_topic_and_questions(self):
        questions = [_scq(), _mcq(), _short_answer(), _true_false()]
        pdf_bytes = build_questions_pdf(questions, TOPIC)
        _assert_openable(pdf_bytes)
        text = _pdf_text(pdf_bytes)

        assert TOPIC in text
        assert "Fragenkatalog" in text
        for q in questions:
            assert q["stem"] in text
        assert "Frage 1" in text
        assert "Frage 4" in text
        assert "Eindeutiger Schluessel" in text
        assert "SQL" in text

    def test_exam_pdf_omits_solutions_and_rationale(self):
        questions = [_scq(), _short_answer()]
        pdf_bytes = build_questions_pdf_exam(questions, TOPIC)
        _assert_openable(pdf_bytes)
        text = _pdf_text(pdf_bytes)

        assert "Klausur" in text
        assert TOPIC in text
        assert questions[0]["stem"] in text
        assert "Begruendung" not in text and "Begründung" not in text
        # Exam-Modus zeigt keine korrekte Antwort als Textlabel
        assert "Korrekte Antwort" not in text


# ---------------------------------------------------------------------------
# Inhaltliche Checks ohne Layout
# ---------------------------------------------------------------------------


class TestPdfContentChecks:
    def test_question_field_aliases_stem_and_question(self):
        q = {
            "type": "SCQ",
            "question": "Alias-Frage ohne stem-Feld?",
            "choices": ["A", "B"],
            "correct_index": 0,
            "difficulty": "easy",
        }
        text = _pdf_text(build_questions_pdf([q], TOPIC))
        assert "Alias-Frage ohne stem-Feld?" in text

    def test_type_and_difficulty_labels_present(self):
        text = _pdf_text(build_questions_pdf([_scq()], TOPIC))
        assert "Single Choice" in text
        assert "Leicht" in text

    def test_mcq_hint_mentions_multiple_correct(self):
        text = _pdf_text(build_questions_pdf([_mcq()], TOPIC))
        assert "Mehrere Antworten korrekt" in text


# ---------------------------------------------------------------------------
# Keine Dateien im Projektverzeichnis
# ---------------------------------------------------------------------------


class TestPdfNoProjectFiles:
    def test_export_leaves_no_files_in_project(self, tmp_path: Path):
        before = {p.name for p in Path.cwd().iterdir()}
        pdf_bytes = build_questions_pdf([_scq(), _mcq()], TOPIC)
        # Optional nur in tmp_path ablegen und wieder öffnen
        target = tmp_path / "export.pdf"
        target.write_bytes(pdf_bytes)
        assert target.exists()
        _assert_openable(target.read_bytes())

        after = {p.name for p in Path.cwd().iterdir()}
        assert after == before
        # BytesIO-Pfad: Service schreibt nicht selbst auf die Platte
        assert isinstance(pdf_bytes, (bytes, bytearray))
        assert len(pdf_bytes) > 0
