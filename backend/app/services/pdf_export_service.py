from __future__ import annotations

import io
from datetime import date
from typing import Any

from fpdf import FPDF

# Seitenränder, Zeilenhöhe und Farben als zentrale Konstanten
_MARGIN = 15
_LINE_HEIGHT = 6
_SECTION_GAP = 4
_CORRECT_COLOR = (0, 128, 0)
_LABEL_COLOR = (80, 80, 80)
_DEFAULT_COLOR = (0, 0, 0)


# Übersetzt "easy/medium/hard" in deutsche Bezeichnungen für die PDF-Ausgabe
def _difficulty_label(difficulty: str) -> str:
    mapping = {"easy": "Leicht", "medium": "Mittel", "hard": "Schwer"}
    return mapping.get(difficulty.lower(), difficulty.capitalize()) if difficulty else "–"


# Übersetzt Fragetyp-Codes ("MCQ" etc.) in lesbare deutsche Bezeichnungen
def _type_label(question_type: str) -> str:
    mapping = {
        "MCQ": "Multiple Choice",
        "SHORT_ANSWER": "Kurzantwort",
        "TRUE_FALSE": "Wahr / Falsch",
    }
    return mapping.get(question_type.upper(), question_type) if question_type else "–"


# Interne PDF-Klasse; erbt von FPDF, damit header() und footer() automatisch pro Seite aufgerufen werden
class _QuestionPDF(FPDF):

    # Initialisiert das Dokument mit festen Rändern und aktiviert den automatischen Seitenumbruch
    def __init__(self, topic: str) -> None:
        super().__init__()
        self._topic = topic
        self.set_auto_page_break(auto=True, margin=_MARGIN + 5)
        self.set_margins(_MARGIN, _MARGIN, _MARGIN)

    # Wird von fpdf2 automatisch oben auf jeder Seite gezeichnet; Seite 1 (Titelseite) bleibt ohne Header
    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*_LABEL_COLOR)
        self.cell(self.epw, 5, self._topic, align="L", new_x="LMARGIN", new_y="NEXT")
        self.ln(3)
        self.set_draw_color(200, 200, 200)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)
        self.set_text_color(*_DEFAULT_COLOR)

    # Wird von fpdf2 automatisch unten auf jeder Seite gezeichnet; zeigt die Seitenzahl zentriert
    def footer(self) -> None:
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*_LABEL_COLOR)
        self.cell(0, 5, f"Seite {self.page_no()}", align="C")
        self.set_text_color(*_DEFAULT_COLOR)

    # Zeichnet eine kleine graue Feldbezeichnung (z.B. "Frage:", "Begründung:")
    def _label(self, text: str) -> None:
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*_LABEL_COLOR)
        self.cell(self.epw, _LINE_HEIGHT, text, new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(*_DEFAULT_COLOR)

    # Zeichnet Fließtext; unterstützt automatischen Zeilenumbruch, optionale Fettschrift und Farbwahl
    def _body(self, text: str, bold: bool = False, color: tuple[int, int, int] = _DEFAULT_COLOR) -> None:
        self.set_x(self.l_margin)
        style = "B" if bold else ""
        self.set_font("Helvetica", style, 10)
        self.set_text_color(*color)
        self.multi_cell(self.epw, _LINE_HEIGHT, text, new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(*_DEFAULT_COLOR)

    # Fügt vertikalen Leerraum ein; Standard entspricht _SECTION_GAP
    def _gap(self, size: int = _SECTION_GAP) -> None:
        self.ln(size)

    # Zeichnet eine hellgraue horizontale Trennlinie mit je 3 mm Abstand davor und danach
    def _divider(self) -> None:
        self._gap(3)
        self.set_draw_color(200, 200, 200)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self._gap(3)

    # Zeichnet ein quadratisches Kästchen; bei checked=True mit einem Häkchen (Diagonale)
    def _draw_checkbox(self, x: float, y: float, size: float = 3.5, checked: bool = False) -> None:
        self.set_draw_color(60, 60, 60)
        self.set_line_width(0.3)
        self.rect(x, y, size, size)
        if checked:
            # Häkchen als zwei Linien (klassisches ✓)
            self.set_draw_color(*_CORRECT_COLOR)
            self.set_line_width(0.6)
            mid_x = x + size * 0.28
            mid_y = y + size * 0.65
            self.line(x + size * 0.1, y + size * 0.5, mid_x, mid_y)
            self.line(mid_x, mid_y, x + size * 0.9, y + size * 0.1)
        self.set_draw_color(200, 200, 200)  # zurück auf Standard-Linienfarbe
        self.set_line_width(0.2)

    # Erstellt Seite 1 mit zentriertem Titel, Thema und Generierungsdatum
    def render_title_page(self, topic: str, gen_date: str, exam_mode: bool = False) -> None:
        self.add_page()

        self.set_font("Helvetica", "B", 22)
        self.set_text_color(30, 30, 30)
        self.ln(20)
        title_text = "Klausur" if exam_mode else "Fragenkatalog"
        self.multi_cell(self.epw, 12, title_text, align="C", new_x="LMARGIN", new_y="NEXT")
        self._gap(6)

        self.set_font("Helvetica", "", 15)
        self.set_text_color(60, 60, 60)
        self.multi_cell(self.epw, 9, topic, align="C", new_x="LMARGIN", new_y="NEXT")
        self._gap(10)

        # Kurze dekorative Linie in der Seitenmitte als optischer Trenner
        self.set_draw_color(180, 180, 180)
        cx = self.w / 2
        line_half = 35
        self.line(cx - line_half, self.get_y(), cx + line_half, self.get_y())
        self._gap(6)

        if not exam_mode:
            self.set_font("Helvetica", "I", 10)
            self.set_text_color(*_LABEL_COLOR)
            self.cell(self.epw, _LINE_HEIGHT, f"Erstellt am: {gen_date}", align="C", new_x="LMARGIN", new_y="NEXT")
            self.set_text_color(*_DEFAULT_COLOR)

        if exam_mode:
            self._gap(8)
            self.set_font("Helvetica", "", 10)
            self.set_text_color(*_LABEL_COLOR)
            self.cell(self.epw, _LINE_HEIGHT, "Name: ________________________________   Datum: ________________", align="C", new_x="LMARGIN", new_y="NEXT")
            self.set_text_color(*_DEFAULT_COLOR)

    # Schreibt alle Felder einer einzelnen Frage auf das Dokument; fpdf2 bricht automatisch auf neue Seiten um
    def render_question(self, index: int, q: dict[str, Any]) -> None:
        stem: str = q.get("stem") or q.get("question") or "–"
        q_type: str = q.get("type") or ""
        difficulty: str = q.get("difficulty") or ""
        choices: list[str] = q.get("choices") or []
        correct_index: int | None = q.get("correct_index")
        answer: str | None = q.get("answer")
        rationale: str | None = q.get("rationale")

        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(20, 20, 20)
        self.cell(self.epw, 7, f"Frage {index}", new_x="LMARGIN", new_y="NEXT")

        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*_LABEL_COLOR)
        meta = f"Typ: {_type_label(q_type)}   |   Schwierigkeit: {_difficulty_label(difficulty)}"
        self.cell(self.epw, 5, meta, new_x="LMARGIN", new_y="NEXT")
        self._gap(3)

        self._label("Frage:")
        self._body(stem)
        self._gap(3)

        if choices:
            # MCQ: jede Option mit gezeichneter Checkbox; korrekte Antwort grün und fett
            self._label("Antwortoptionen:")
            for i, choice in enumerate(choices):
                is_correct = (correct_index is not None and i == correct_index)
                # Checkbox zeichnen, dann Beschriftungstext daneben
                cb_x = self.l_margin + 2
                cb_y = self.get_y() + 1.5
                self._draw_checkbox(cb_x, cb_y, size=3.5, checked=is_correct)
                label_color = _CORRECT_COLOR if is_correct else _DEFAULT_COLOR
                label_style = "B" if is_correct else ""
                self.set_x(self.l_margin + 8)
                self.set_font("Helvetica", label_style, 10)
                self.set_text_color(*label_color)
                self.multi_cell(self.epw - 8, _LINE_HEIGHT, choice, new_x="LMARGIN", new_y="NEXT")
                self.set_text_color(*_DEFAULT_COLOR)
            self._gap(3)

        elif answer is not None:
            # Kurzantwort / Wahr-Falsch: korrekte Antwort direkt als grüner Text
            self._label("Korrekte Antwort:")
            self._body(str(answer), bold=True, color=_CORRECT_COLOR)
            self._gap(3)

        if rationale:
            self._label("Begründung:")
            self._body(rationale)

        self._divider()

    # Exam-Modus: nur Frage + Antwortoptionen, keine Typ-/Schwierigkeits-Meta, kein Häkchen, keine Begründung
    def render_question_exam(self, index: int, q: dict[str, Any]) -> None:
        stem: str = q.get("stem") or q.get("question") or "–"
        choices: list[str] = q.get("choices") or []
        answer: str | None = q.get("answer")

        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(20, 20, 20)
        self.cell(self.epw, 7, f"Frage {index}", new_x="LMARGIN", new_y="NEXT")
        self._gap(2)

        self._label("Frage:")
        self._body(stem)
        self._gap(3)

        if choices:
            # MCQ: leere Checkboxen ohne Markierung der korrekten Antwort
            self._label("Antwortoptionen:")
            for i, choice in enumerate(choices):
                cb_x = self.l_margin + 2
                cb_y = self.get_y() + 1.5
                self._draw_checkbox(cb_x, cb_y, size=3.5, checked=False)
                self.set_x(self.l_margin + 8)
                self.set_font("Helvetica", "", 10)
                self.set_text_color(*_DEFAULT_COLOR)
                self.multi_cell(self.epw - 8, _LINE_HEIGHT, choice, new_x="LMARGIN", new_y="NEXT")
            self._gap(3)

        elif answer is not None:
            # Kurzantwort / Wahr-Falsch: leeres Antwortfeld für den Schüler
            self._label("Antwort:")
            self._gap(8)

        self._divider()


# Öffentlicher Einstiegspunkt: vollständiges PDF mit Lösungen und Begründungen
def build_questions_pdf(questions: list[dict], topic: str) -> bytes:
    gen_date = date.today().strftime("%d.%m.%Y")

    pdf = _QuestionPDF(topic=topic)
    pdf.render_title_page(topic=topic, gen_date=gen_date)

    if questions:
        pdf.add_page()
        for idx, question in enumerate(questions, start=1):
            pdf.render_question(index=idx, q=question)

    buffer = io.BytesIO()
    raw: bytes = pdf.output()
    buffer.write(raw)
    return buffer.getvalue()


# Öffentlicher Einstiegspunkt: Klausur-PDF ohne Lösungen und Begründungen (für Schüler)
def build_questions_pdf_exam(questions: list[dict], topic: str) -> bytes:
    gen_date = date.today().strftime("%d.%m.%Y")

    pdf = _QuestionPDF(topic=topic)
    pdf.render_title_page(topic=topic, gen_date=gen_date, exam_mode=True)

    if questions:
        pdf.add_page()
        for idx, question in enumerate(questions, start=1):
            pdf.render_question_exam(index=idx, q=question)

    buffer = io.BytesIO()
    raw: bytes = pdf.output()
    buffer.write(raw)
    return buffer.getvalue()
