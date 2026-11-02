"""Unit-Tests für den Moodle-XML-Export (T8.3).

Geprüft werden Wohlgeformtheit, Fragetypen (SCQ, MCQ, TRUE_FALSE, SHORT_ANSWER),
Antworten/Punkteverteilung sowie das Überspringen unbekannter/ungültiger Typen.
Es werden keine Dateien im Projektverzeichnis erzeugt.
"""

from __future__ import annotations

import xml.etree.ElementTree as ET

import pytest

from app.services.moodle_export_service import build_moodle_xml

TOPIC = "Relationale Datenbanken"


# ---------------------------------------------------------------------------
# Fixtures / Hilfsdaten
# ---------------------------------------------------------------------------


def _scq(**overrides) -> dict:
    base = {
        "type": "SCQ",
        "stem": "Was ist ein Primaerschluessel?",
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
        "choices": ["Selektion", "Projektion", "Schleife", "Join"],
        "correct_indices": [0, 1, 3],
        "rationale": "Selektion, Projektion und Join sind relational.",
    }
    base.update(overrides)
    return base


def _true_false(**overrides) -> dict:
    base = {
        "type": "TRUE_FALSE",
        "stem": "NULL ist gleich NULL.",
        "choices": ["TRUE", "FALSE"],
        "correct_index": 1,
    }
    base.update(overrides)
    return base


def _short_answer(**overrides) -> dict:
    base = {
        "type": "SHORT_ANSWER",
        "stem": "Wie heisst die Abfragesprache fuer relationale DBs?",
        "answer": "SQL",
    }
    base.update(overrides)
    return base


def _parse(xml_str: str) -> ET.Element:
    return ET.fromstring(xml_str)


def _question_text(question_el: ET.Element) -> str:
    return question_el.find("./questiontext/text").text or ""


def _answer_texts(question_el: ET.Element) -> list[str]:
    return [(el.find("text").text or "") for el in question_el.findall("answer")]


def _answer_fractions(question_el: ET.Element) -> list[str]:
    return [el.get("fraction", "") for el in question_el.findall("answer")]


# ---------------------------------------------------------------------------
# Wohlgeformtheit und Grundstruktur
# ---------------------------------------------------------------------------


class TestMoodleXmlWellFormed:
    def test_xml_declaration_and_root(self):
        xml_str = build_moodle_xml([_scq()], TOPIC)
        assert xml_str.startswith('<?xml version="1.0" encoding="UTF-8"?>')
        root = _parse(xml_str)
        assert root.tag == "quiz"

    def test_empty_question_list_yields_empty_quiz(self):
        xml_str = build_moodle_xml([], TOPIC)
        root = _parse(xml_str)
        assert root.tag == "quiz"
        assert list(root) == []

    def test_all_supported_types_produce_one_question_each(self):
        questions = [_scq(), _mcq(), _true_false(), _short_answer()]
        root = _parse(build_moodle_xml(questions, TOPIC))
        assert len(root.findall("question")) == 4


# ---------------------------------------------------------------------------
# SCQ
# ---------------------------------------------------------------------------


class TestMoodleScqExport:
    def test_type_is_multichoice_single_true(self):
        root = _parse(build_moodle_xml([_scq()], TOPIC))
        q = root.find("question")
        assert q.get("type") == "multichoice"
        assert q.findtext("single") == "true"

    def test_stem_and_choices(self):
        scq = _scq()
        root = _parse(build_moodle_xml([scq], TOPIC))
        q = root.find("question")
        assert scq["stem"] in _question_text(q)
        texts = _answer_texts(q)
        assert len(texts) == 4
        for choice in scq["choices"]:
            assert any(choice in t for t in texts)

    def test_points_100_for_correct_0_for_wrong(self):
        root = _parse(build_moodle_xml([_scq(correct_index=2)], TOPIC))
        fractions = _answer_fractions(root.find("question"))
        assert fractions == ["0", "0", "100", "0"]

    def test_rationale_on_correct_answer_only(self):
        scq = _scq(correct_index=1, rationale="Richtige Begruendung")
        root = _parse(build_moodle_xml([scq], TOPIC))
        answers = root.find("question").findall("answer")
        feedbacks = [(a.find("./feedback/text").text or "") for a in answers]
        assert "Richtige Begruendung" in feedbacks[1]
        assert feedbacks[0] == ""
        assert feedbacks[2] == ""
        assert feedbacks[3] == ""


# ---------------------------------------------------------------------------
# MCQ
# ---------------------------------------------------------------------------


class TestMoodleMcqExport:
    def test_type_is_multichoice_single_false(self):
        root = _parse(build_moodle_xml([_mcq()], TOPIC))
        q = root.find("question")
        assert q.get("type") == "multichoice"
        assert q.findtext("single") == "false"

    def test_points_distributed_across_correct_answers(self):
        # 3 korrekte → je ca. 33.3333333; 1 falsch → -100
        root = _parse(build_moodle_xml([_mcq(correct_indices=[0, 1, 3])], TOPIC))
        fractions = [float(f) for f in _answer_fractions(root.find("question"))]
        assert len(fractions) == 4
        assert fractions[0] == pytest.approx(100 / 3, abs=1e-5)
        assert fractions[1] == pytest.approx(100 / 3, abs=1e-5)
        assert fractions[2] == pytest.approx(-100.0, abs=1e-5)
        assert fractions[3] == pytest.approx(100 / 3, abs=1e-5)

    def test_stem_and_choices_present(self):
        mcq = _mcq()
        root = _parse(build_moodle_xml([mcq], TOPIC))
        q = root.find("question")
        assert mcq["stem"] in _question_text(q)
        for choice in mcq["choices"]:
            assert any(choice in t for t in _answer_texts(q))

    def test_mcq_without_correct_indices_is_skipped(self):
        root = _parse(build_moodle_xml([_mcq(correct_indices=[])], TOPIC))
        assert root.findall("question") == []


# ---------------------------------------------------------------------------
# TRUE_FALSE
# ---------------------------------------------------------------------------


class TestMoodleTrueFalseExport:
    def test_type_and_answer_order(self):
        root = _parse(build_moodle_xml([_true_false()], TOPIC))
        q = root.find("question")
        assert q.get("type") == "truefalse"
        assert _answer_texts(q) == ["true", "false"]

    def test_correct_false_gets_100(self):
        root = _parse(build_moodle_xml([_true_false(correct_index=1)], TOPIC))
        assert _answer_fractions(root.find("question")) == ["0", "100"]

    def test_correct_true_gets_100(self):
        q = _true_false(choices=["TRUE", "FALSE"], correct_index=0)
        root = _parse(build_moodle_xml([q], TOPIC))
        assert _answer_fractions(root.find("question")) == ["100", "0"]

    def test_answer_field_fallback(self):
        q = {"type": "TRUE_FALSE", "stem": "Aussage?", "answer": "wahr"}
        root = _parse(build_moodle_xml([q], TOPIC))
        assert _answer_fractions(root.find("question")) == ["100", "0"]


# ---------------------------------------------------------------------------
# SHORT_ANSWER
# ---------------------------------------------------------------------------


class TestMoodleShortAnswerExport:
    def test_type_and_answer(self):
        sa = _short_answer()
        root = _parse(build_moodle_xml([sa], TOPIC))
        q = root.find("question")
        assert q.get("type") == "shortanswer"
        assert q.findtext("usecase") == "0"
        assert _answer_texts(q) == [sa["answer"]]
        assert _answer_fractions(q) == ["100"]
        assert sa["stem"] in _question_text(q)


# ---------------------------------------------------------------------------
# Unbekannte / ungültige Typen
# ---------------------------------------------------------------------------


class TestMoodleUnknownAndInvalidTypes:
    def test_unknown_type_is_skipped(self):
        unknown = {"type": "ESSAY", "stem": "Schreibe einen Aufsatz."}
        root = _parse(build_moodle_xml([unknown, _scq()], TOPIC))
        questions = root.findall("question")
        assert len(questions) == 1
        assert questions[0].get("type") == "multichoice"

    def test_missing_type_is_skipped(self):
        root = _parse(build_moodle_xml([{"stem": "Ohne Typ"}], TOPIC))
        assert root.findall("question") == []

    def test_lowercase_type_is_accepted(self):
        root = _parse(build_moodle_xml([_scq(type="scq")], TOPIC))
        assert len(root.findall("question")) == 1

    def test_mixed_list_keeps_only_valid(self):
        questions = [
            _scq(),
            {"type": "UNKNOWN", "stem": "x"},
            _short_answer(),
            _mcq(correct_indices=[]),
            _true_false(),
        ]
        root = _parse(build_moodle_xml(questions, TOPIC))
        types = [q.get("type") for q in root.findall("question")]
        assert types == ["multichoice", "shortanswer", "truefalse"]
