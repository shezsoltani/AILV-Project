import pytest

from app.core.exceptions import FactCheckValidationError
from app.services.validators.fact_check_validator import validate_fact_check

CONTEXT = (
    "Die Photosynthese findet in den Chloroplasten statt.\n"
    "Dabei wird Lichtenergie in chemische Energie umgewandelt."
)
UPLOAD = "Chlorophyll absorbiert vor allem rotes und blaues Licht."

QUESTIONS = [{"id": 1}, {"id": 2}]

QUOTE_1 = "Die Photosynthese findet in den Chloroplasten statt."
QUOTE_2 = "Chlorophyll absorbiert vor allem rotes und blaues Licht."


def _valid_results():
    return [
        {"id": 1, "status": "supported", "evidence": [QUOTE_1], "note": "Steht im Text."},
        {"id": 2, "status": "not_supported", "evidence": [], "note": "Nicht belegt."},
    ]


def _context():
    return CONTEXT + "\n" + UPLOAD


def test_valid_result_passes():
    validate_fact_check(_valid_results(), QUESTIONS, _context())


def test_valid_result_with_partially_supported_and_upload_context():
    results = [
        {"id": 1, "status": "partially_supported", "evidence": [QUOTE_1], "note": "Teilweise."},
        {"id": 2, "status": "supported", "evidence": [QUOTE_2], "note": "Ok."},
    ]
    validate_fact_check(results, QUESTIONS, [CONTEXT, UPLOAD])


def test_invented_quote_is_rejected():
    results = _valid_results()
    results[0]["evidence"] = ["Die Photosynthese findet im Zellkern der Pflanze statt."]
    with pytest.raises(FactCheckValidationError, match="Frage 1.*nicht wörtlich"):
        validate_fact_check(results, QUESTIONS, _context())


def test_missing_question_is_rejected():
    results = _valid_results()[:1]
    with pytest.raises(FactCheckValidationError, match="fehlt ein Ergebnis: 2"):
        validate_fact_check(results, QUESTIONS, _context())


def test_unknown_question_id_is_rejected():
    results = _valid_results()
    results[1]["id"] = 99
    with pytest.raises(FactCheckValidationError, match="keine Frage"):
        validate_fact_check(results, QUESTIONS, _context())


def test_duplicate_result_is_rejected():
    results = _valid_results() + [_valid_results()[0]]
    with pytest.raises(FactCheckValidationError, match="mehr als ein Ergebnis"):
        validate_fact_check(results, QUESTIONS, _context())


def test_unknown_status_is_rejected():
    results = _valid_results()
    results[1]["status"] = "maybe"
    with pytest.raises(FactCheckValidationError, match="unbekannten Status 'maybe'"):
        validate_fact_check(results, QUESTIONS, _context())


def test_quote_with_different_line_break_and_case_is_found():
    results = _valid_results()
    results[0]["evidence"] = [
        "die photosynthese findet in den chloroplasten statt.   dabei wird\n lichtenergie in chemische energie umgewandelt."
    ]
    validate_fact_check(results, QUESTIONS, _context())


def test_quote_with_different_quotation_marks_is_found():
    context = 'Der Lehrer sagte: „Pflanzen brauchen Licht zum Wachsen“ und ging.'
    results = [{"id": 1, "status": "supported",
                "evidence": ['"Pflanzen brauchen Licht zum Wachsen"'], "note": "x"}]
    validate_fact_check(results, [{"id": 1}], context)


def test_supported_without_quote_is_rejected():
    results = _valid_results()
    results[0]["evidence"] = []
    with pytest.raises(FactCheckValidationError, match="Frage 1.*kein Zitat"):
        validate_fact_check(results, QUESTIONS, _context())


def test_not_supported_with_quote_is_rejected():
    results = _valid_results()
    results[1]["evidence"] = [QUOTE_2]
    with pytest.raises(FactCheckValidationError, match="Frage 2.*not_supported"):
        validate_fact_check(results, QUESTIONS, _context())


def test_too_short_quote_is_rejected():
    results = _valid_results()
    results[0]["evidence"] = ["Chloroplasten"]
    with pytest.raises(FactCheckValidationError, match="zu kurz"):
        validate_fact_check(results, QUESTIONS, _context())


@pytest.mark.parametrize("context", ["", None, "   \n "])
def test_empty_context_is_rejected(context):
    with pytest.raises(FactCheckValidationError, match="keine Unterlagen"):
        validate_fact_check(_valid_results(), QUESTIONS, context)


def test_empty_context_is_ok_if_nothing_is_quoted():
    results = [
        {"id": 1, "status": "not_supported", "evidence": [], "note": "a"},
        {"id": 2, "status": "not_supported", "evidence": [], "note": "b"},
    ]
    validate_fact_check(results, QUESTIONS, "")


def test_result_is_not_a_list():
    with pytest.raises(FactCheckValidationError, match="JSON-Liste"):
        validate_fact_check({"id": 1}, QUESTIONS, _context())


def test_evidence_not_a_list():
    results = _valid_results()
    results[0]["evidence"] = QUOTE_1
    with pytest.raises(FactCheckValidationError, match="Liste von Texten"):
        validate_fact_check(results, QUESTIONS, _context())


def test_note_not_a_string():
    results = _valid_results()
    results[0]["note"] = None
    with pytest.raises(FactCheckValidationError, match="'note'"):
        validate_fact_check(results, QUESTIONS, _context())