"""Unit-Tests für den PPTX-Export (T8.3).

Geprüft werden unterschiedliche Folientypen, erneutes Öffnen mit python-pptx
sowie Reihenfolge, Titel und Folienanzahl. Exporte bleiben im Speicher bzw.
in temporären Verzeichnissen; das Projektverzeichnis bleibt unverändert.
"""

from __future__ import annotations

import io
from pathlib import Path

from pptx import Presentation

from app.services.pptx_export_service import build_slides_pptx

TOPIC = "Relationale Datenbanken"


def _title_slide(**overrides) -> dict:
    base = {
        "position": 1,
        "slide_type": "title",
        "title": "Einfuehrung in Datenbanken",
        "bullets": ["Ueberblick", "Lernziele"],
        "examples": [],
    }
    base.update(overrides)
    return base


def _content_slide(position: int = 2, **overrides) -> dict:
    base = {
        "position": position,
        "slide_type": "content",
        "title": "Primaerschluessel",
        "bullets": ["Eindeutig", "Nicht NULL"],
        "examples": ["id in der Tabelle students"],
    }
    base.update(overrides)
    return base


def _closing_slide(**overrides) -> dict:
    base = {
        "position": 3,
        "slide_type": "closing",
        "title": "Zusammenfassung",
        "bullets": ["Schluesselkonzepte", "Naechste Schritte"],
        "examples": [],
    }
    base.update(overrides)
    return base


def _open_pptx(pptx_bytes: bytes) -> Presentation:
    assert isinstance(pptx_bytes, (bytes, bytearray))
    assert len(pptx_bytes) > 0
    # PPTX ist ein ZIP; beginnt mit PK
    assert pptx_bytes[:2] == b"PK"
    return Presentation(io.BytesIO(pptx_bytes))


def _slide_texts(slide) -> list[str]:
    texts: list[str] = []
    for shape in slide.shapes:
        if not shape.has_text_frame:
            continue
        for paragraph in shape.text_frame.paragraphs:
            combined = "".join(run.text for run in paragraph.runs).strip()
            if combined:
                texts.append(combined)
    return texts


def _slide_titles(prs: Presentation) -> list[str]:
    """Erster nicht-leerer Text einer Folie gilt als Titel."""
    titles: list[str] = []
    for slide in prs.slides:
        texts = _slide_texts(slide)
        titles.append(texts[0] if texts else "")
    return titles


# ---------------------------------------------------------------------------
# Öffnen und Folientypen
# ---------------------------------------------------------------------------


class TestPptxOpenAndTypes:
    def test_empty_slides_yield_openable_presentation(self):
        pptx_bytes = build_slides_pptx([], TOPIC)
        prs = _open_pptx(pptx_bytes)
        assert len(prs.slides) == 0

    def test_title_content_closing_export(self):
        slides = [_title_slide(), _content_slide(), _closing_slide()]
        prs = _open_pptx(build_slides_pptx(slides, TOPIC))
        assert len(prs.slides) == 3
        titles = _slide_titles(prs)
        assert titles[0] == "Einfuehrung in Datenbanken"
        assert titles[1] == "Primaerschluessel"
        assert titles[2] == "Zusammenfassung"

    def test_content_includes_bullets_and_examples(self):
        slide = _content_slide(
            title="Normalisierung",
            bullets=["1NF", "2NF"],
            examples=["Studenten-Tabelle"],
        )
        prs = _open_pptx(build_slides_pptx([slide], TOPIC))
        all_text = "\n".join(_slide_texts(prs.slides[0]))
        assert "Normalisierung" in all_text
        assert "1NF" in all_text
        assert "2NF" in all_text
        assert "Studenten-Tabelle" in all_text
        assert "Bsp.:" in all_text


# ---------------------------------------------------------------------------
# Reihenfolge und Anzahl
# ---------------------------------------------------------------------------


class TestPptxOrderAndCount:
    def test_slides_are_sorted_by_position(self):
        slides = [
            _closing_slide(position=3, title="Ende"),
            _title_slide(position=1, title="Start"),
            _content_slide(position=2, title="Mitte"),
        ]
        prs = _open_pptx(build_slides_pptx(slides, TOPIC))
        assert _slide_titles(prs) == ["Start", "Mitte", "Ende"]

    def test_slide_count_matches_input(self):
        slides = [
            _title_slide(position=1),
            _content_slide(position=2, title="Kapitel 1"),
            _content_slide(position=3, title="Kapitel 2"),
            _content_slide(position=4, title="Kapitel 3"),
            _closing_slide(position=5),
        ]
        prs = _open_pptx(build_slides_pptx(slides, TOPIC))
        assert len(prs.slides) == 5
        assert _slide_titles(prs) == [
            "Einfuehrung in Datenbanken",
            "Kapitel 1",
            "Kapitel 2",
            "Kapitel 3",
            "Zusammenfassung",
        ]

    def test_unknown_slide_type_falls_back_to_content(self):
        slide = {
            "position": 1,
            "slide_type": "section",
            "title": "Sonderfolie",
            "bullets": ["Punkt"],
            "examples": [],
        }
        prs = _open_pptx(build_slides_pptx([slide], TOPIC))
        assert len(prs.slides) == 1
        assert _slide_titles(prs)[0] == "Sonderfolie"


# ---------------------------------------------------------------------------
# Keine Dateien im Projektverzeichnis
# ---------------------------------------------------------------------------


class TestPptxNoProjectFiles:
    def test_export_in_memory_and_optional_tmp(self, tmp_path: Path):
        before = {p.name for p in Path.cwd().iterdir()}
        pptx_bytes = build_slides_pptx(
            [_title_slide(), _content_slide(), _closing_slide()],
            TOPIC,
        )
        # Erneut im Speicher öffnen
        prs = _open_pptx(pptx_bytes)
        assert len(prs.slides) == 3

        # Optional in tmp_path schreiben (nicht Projektverzeichnis)
        target = tmp_path / "folien.pptx"
        target.write_bytes(pptx_bytes)
        reopened = Presentation(str(target))
        assert len(reopened.slides) == 3

        after = {p.name for p in Path.cwd().iterdir()}
        assert after == before
