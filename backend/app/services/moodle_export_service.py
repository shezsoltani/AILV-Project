from __future__ import annotations

import xml.etree.ElementTree as ET

# Mapping von unseren internen Typen auf das, was Moodle im XML erwartet
_TYPE_MAP: dict[str, str] = {
    "MCQ": "multichoice",
    "TRUE_FALSE": "truefalse",
    "SHORT_ANSWER": "shortanswer",
}


def build_moodle_xml(questions: list[dict], topic: str) -> str:
    quiz = ET.Element("quiz")

    for q in questions:
        q_type_raw: str = (q.get("type") or "").upper()
        moodle_type = _TYPE_MAP.get(q_type_raw)

        # Unbekannte Typen überspringen – lieber nichts exportieren als kaputtes XML
        if moodle_type is None:
            continue

        question_el = _build_question_element(q, moodle_type)
        quiz.append(question_el)

    return _serialize(quiz)


def _build_question_element(q: dict, moodle_type: str) -> ET.Element:
    question_el = ET.Element("question", type=moodle_type)

    stem: str = q.get("stem") or q.get("question") or ""
    name_el = ET.SubElement(question_el, "name")
    ET.SubElement(name_el, "text").text = stem[:80] if stem else "Frage"

    questiontext_el = ET.SubElement(question_el, "questiontext", format="html")
    ET.SubElement(questiontext_el, "text").text = f"<p>{stem}</p>"

    # Moodle meckert beim Import, wenn generalfeedback fehlt
    generalfeedback_el = ET.SubElement(question_el, "generalfeedback", format="html")
    ET.SubElement(generalfeedback_el, "text").text = ""

    ET.SubElement(question_el, "defaultgrade").text = "1.0000000"
    ET.SubElement(question_el, "penalty").text = "0.3333333"
    ET.SubElement(question_el, "hidden").text = "0"

    if moodle_type == "multichoice":
        _append_mcq_answers(question_el, q)
    elif moodle_type == "truefalse":
        _append_truefalse_answers(question_el, q)
    elif moodle_type == "shortanswer":
        _append_shortanswer_answers(question_el, q)

    return question_el


def _append_mcq_answers(question_el: ET.Element, q: dict) -> None:
    ET.SubElement(question_el, "single").text = "true"
    ET.SubElement(question_el, "shuffleanswers").text = "1"
    ET.SubElement(question_el, "answernumbering").text = "abc"

    choices: list[str] = q.get("choices") or []
    correct_index: int | None = q.get("correct_index")
    rationale: str = q.get("rationale") or ""

    for i, choice_text in enumerate(choices):
        is_correct = correct_index is not None and i == correct_index
        fraction = "100" if is_correct else "0"

        answer_el = ET.SubElement(question_el, "answer", fraction=fraction, format="html")
        ET.SubElement(answer_el, "text").text = f"<p>{choice_text}</p>"

        # Die Begründung hängen wir nur an die richtige Antwort
        feedback_el = ET.SubElement(answer_el, "feedback", format="html")
        ET.SubElement(feedback_el, "text").text = (
            f"<p>{rationale}</p>" if is_correct and rationale else ""
        )


# Alles, was irgendwie „wahr" oder „falsch" bedeutet
_TRUE_TOKENS = frozenset({"true", "wahr", "yes", "ja", "1"})
_FALSE_TOKENS = frozenset({"false", "falsch", "no", "nein", "0"})


def _parse_boolish(text: str) -> bool | None:
    normalized = text.strip().lower()
    if normalized in _TRUE_TOKENS:
        return True
    if normalized in _FALSE_TOKENS:
        return False
    return None


# Ist die richtige Antwort 'true'? Erst choices prüfen, dann answer als Fallback
def _resolve_correct_is_true(q: dict) -> bool:
    choices: list[str] = q.get("choices") or []
    correct_index: int | None = q.get("correct_index")

    if len(choices) >= 2 and isinstance(correct_index, int) and 0 <= correct_index < len(choices):
        direct = _parse_boolish(choices[correct_index])
        if direct is not None:
            return direct

        # Die Reihenfolge in choices ist nicht garantiert – kann auch ["FALSE", "TRUE"] sein
        first, second = _parse_boolish(choices[0]), _parse_boolish(choices[1])
        if first is True and second is False:
            return correct_index == 0
        if first is False and second is True:
            return correct_index == 1

    # Fallback: answer-Feld auswerten
    raw_answer = q.get("answer")
    if raw_answer is not None:
        if isinstance(raw_answer, bool):
            return raw_answer
        parsed = _parse_boolish(str(raw_answer))
        if parsed is not None:
            return parsed

    return False


def _append_truefalse_answers(question_el: ET.Element, q: dict) -> None:
    correct_is_true = _resolve_correct_is_true(q)

    # Moodle erwartet genau diese Reihenfolge: erst true, dann false
    for label, is_correct_answer in (("true", correct_is_true), ("false", not correct_is_true)):
        fraction = "100" if is_correct_answer else "0"
        answer_el = ET.SubElement(question_el, "answer", fraction=fraction, format="moodle_auto_format")
        ET.SubElement(answer_el, "text").text = label
        feedback_el = ET.SubElement(answer_el, "feedback", format="html")
        ET.SubElement(feedback_el, "text").text = ""


def _append_shortanswer_answers(question_el: ET.Element, q: dict) -> None:
    ET.SubElement(question_el, "usecase").text = "0"  # Groß-/Kleinschreibung ignorieren

    answer_text: str = str(q.get("answer") or "")
    answer_el = ET.SubElement(question_el, "answer", fraction="100", format="moodle_auto_format")
    ET.SubElement(answer_el, "text").text = answer_text
    feedback_el = ET.SubElement(answer_el, "feedback", format="html")
    ET.SubElement(feedback_el, "text").text = ""


def _serialize(quiz: ET.Element) -> str:
    ET.indent(quiz, space="  ")

    xml_str: str = ET.tostring(quiz, encoding="unicode", xml_declaration=False)

    # ET.tostring gibt keine XML-Deklaration aus, Moodle braucht sie aber
    declaration = '<?xml version="1.0" encoding="UTF-8"?>\n'
    return declaration + xml_str
