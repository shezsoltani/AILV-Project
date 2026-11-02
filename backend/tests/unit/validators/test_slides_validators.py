"""
Unit-Tests für die Folien-Validatoren.
Kein Datenbankzugriff, keine Netzwerkverbindung nötig.
"""

import pytest
from fastapi import HTTPException

from app.services.validators.slides_request_validator import SlidesGenerateRequestValidator
from app.services.validators.slides_outline_validator import validate_slide_outline
from app.services.validators.slides_content_validator import validate_slides_content
from app.services.validators.slides_improve_validator import validate_slides_improve
from app.core.exceptions import (
    ContextTextTooLongError,
    SlideOutlineValidationError,
    SlidesContentValidationError,
    SlidesImproveValidationError,
)
from app.models.generate_models import Language


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

def _outline(n: int = 3) -> list[dict]:
    """Minimale, valide Outline mit n Folien (title + n-2 content + closing)."""
    slides = [{"position": 1, "slide_type": "title", "title": "Einleitung"}]
    for i in range(2, n):
        slides.append({"position": i, "slide_type": "content", "title": f"Kapitel {i}"})
    slides.append({"position": n, "slide_type": "closing", "title": "Zusammenfassung"})
    return slides

# Bullets mit ≥8 Wörtern (Minimum-Anforderung des Validators)
_LONG_BULLET = [
    "Photosynthese wandelt Lichtenergie in chemische Energie mithilfe von Chlorophyll um",
    "Pflanzen benötigen Kohlendioxid, Wasser und Sonnenlicht für den gesamten Prozess",
    "Das Ergebnis sind Glucose als Energiespeicher und Sauerstoff als Nebenprodukt",
]

def _content_slide(position: int, slide_type: str, title: str,
                   bullets: list[str] | None = None,
                   examples: list[str] | None = None) -> dict:
    """Erstellt ein valides Content-Slide-Dict."""
    if bullets is None:
        if slide_type == "title":
            bullets = ["Willkommen zur Präsentation über dieses wichtige Thema heute"]
        elif slide_type == "closing":
            bullets = ["Vielen Dank für Ihre Aufmerksamkeit und Ihre wertvollen Fragen",
                       "Fragen und Anmerkungen sind herzlich willkommen und erwünscht"]
        else:
            bullets = list(_LONG_BULLET)
    return {
        "position": position,
        "slide_type": slide_type,
        "title": title,
        "bullets": bullets,
        "examples": examples if examples is not None else [],
    }

def _valid_content(outline: list[dict]) -> list[dict]:
    """Erstellt valide Content-Slides passend zur Outline.

    Alle content-Slides erhalten ein Beispiel, damit die 30%-Ratio immer erfüllt ist.
    """
    slides = []
    for o in outline:
        examples = ["Beispiel: Sonnenenergie in Algen"] if o["slide_type"] == "content" else []
        slides.append(_content_slide(o["position"], o["slide_type"], o["title"],
                                     examples=examples))
    return slides


# ===========================================================================
# SlidesGenerateRequestValidator
# ===========================================================================

class _FakeLanguage:
    """Stand-in für eine nicht unterstützte Sprache (Language-Enum kennt nur de/en)."""
    def __init__(self, value: str):
        self.value = value


class _FakeReq:
    """Minimales Fake-Request-Objekt, das Pydantic-Validierung umgeht."""
    def __init__(self, **kw):
        self.topic = kw.get("topic", "Klimawandel")
        self.slide_count = kw.get("slide_count", 5)
        self.language = kw.get("language", Language.de)
        self.context_text = kw.get("context_text", None)
        self.upload_context = kw.get("upload_context", None)
        self.custom_prompts = kw.get("custom_prompts", None)


class TestSlidesRequestValidator:
    v = SlidesGenerateRequestValidator()

    def test_valid_request(self):
        self.v.validate(_FakeReq())

    def test_topic_too_short_raises(self):
        with pytest.raises(HTTPException) as exc:
            self.v.validate(_FakeReq(topic="AB"))
        assert exc.value.status_code == 422

    def test_topic_too_long_raises(self):
        with pytest.raises(HTTPException) as exc:
            self.v.validate(_FakeReq(topic="x" * 201))
        assert exc.value.status_code == 422

    def test_slide_count_at_min_passes(self):
        self.v.validate(_FakeReq(slide_count=5))

    def test_slide_count_at_max_passes(self):
        self.v.validate(_FakeReq(slide_count=30))

    def test_slide_count_below_min_raises(self):
        with pytest.raises(HTTPException) as exc:
            self.v.validate(_FakeReq(slide_count=4))
        assert exc.value.status_code == 422

    def test_slide_count_above_max_raises(self):
        with pytest.raises(HTTPException) as exc:
            self.v.validate(_FakeReq(slide_count=31))
        assert exc.value.status_code == 422

    def test_supported_language_en_passes(self):
        self.v.validate(_FakeReq(language=Language.en))

    def test_unsupported_language_raises(self):
        with pytest.raises(HTTPException) as exc:
            self.v.validate(_FakeReq(language=_FakeLanguage("fr")))
        assert exc.value.status_code == 422

    def test_context_text_over_limit_raises(self):
        with pytest.raises(ContextTextTooLongError):
            self.v.validate(_FakeReq(context_text="x" * 5001))

    def test_upload_context_over_limit_raises(self):
        with pytest.raises(ContextTextTooLongError):
            self.v.validate(_FakeReq(upload_context="x" * 5001))


# ===========================================================================
# validate_slide_outline
# ===========================================================================

class TestSlideOutlineValidator:

    def test_valid_outline(self):
        validate_slide_outline(_outline(4), expected_count=4)

    def test_wrong_count_raises(self):
        with pytest.raises(SlideOutlineValidationError, match="Expected 5"):
            validate_slide_outline(_outline(4), expected_count=5)

    def test_missing_field_raises(self):
        data = [{"position": 1, "slide_type": "title"}]  # kein title
        with pytest.raises(SlideOutlineValidationError, match="title"):
            validate_slide_outline(data, expected_count=1)

    def test_first_slide_not_title_raises(self):
        data = _outline(3)
        data[0]["slide_type"] = "content"
        with pytest.raises(SlideOutlineValidationError, match="title"):
            validate_slide_outline(data, expected_count=3)

    def test_last_slide_not_closing_raises(self):
        data = _outline(3)
        data[-1]["slide_type"] = "content"
        with pytest.raises(SlideOutlineValidationError, match="closing"):
            validate_slide_outline(data, expected_count=3)

    def test_middle_slide_not_content_raises(self):
        data = _outline(4)
        data[1]["slide_type"] = "closing"
        with pytest.raises(SlideOutlineValidationError, match="content"):
            validate_slide_outline(data, expected_count=4)

    def test_wrong_position_raises(self):
        data = _outline(3)
        data[1]["position"] = 99
        with pytest.raises(SlideOutlineValidationError, match="position"):
            validate_slide_outline(data, expected_count=3)


# ===========================================================================
# validate_slides_content
# ===========================================================================

class TestSlidesContentValidator:

    def test_valid_content(self):
        outline = _outline(3)
        validate_slides_content(_valid_content(outline), outline)

    def test_wrong_slide_count_raises(self):
        outline = _outline(3)
        content = _valid_content(outline)
        with pytest.raises(SlidesContentValidationError, match="Expected"):
            validate_slides_content(content[:1], outline)

    def test_missing_field_raises(self):
        outline = _outline(3)
        content = _valid_content(outline)
        del content[0]["bullets"]
        with pytest.raises(SlidesContentValidationError, match="bullets"):
            validate_slides_content(content, outline)

    def test_title_mismatch_raises(self):
        outline = _outline(3)
        content = _valid_content(outline)
        content[0]["title"] = "Falscher Titel"
        with pytest.raises(SlidesContentValidationError, match="title"):
            validate_slides_content(content, outline)

    def test_slide_type_mismatch_raises(self):
        outline = _outline(3)
        content = _valid_content(outline)
        content[0]["slide_type"] = "content"
        with pytest.raises(SlidesContentValidationError, match="slide_type"):
            validate_slides_content(content, outline)

    def test_too_few_bullets_raises(self):
        outline = _outline(3)
        content = _valid_content(outline)
        # content-Slide braucht 3–7 Bullets; leere Liste → zu wenig
        content[1]["bullets"] = []
        with pytest.raises(SlidesContentValidationError, match="bullets"):
            validate_slides_content(content, outline)

    def test_placeholder_bullet_raises(self):
        outline = _outline(3)
        content = _valid_content(outline)
        content[1]["bullets"][0] = "..."
        with pytest.raises(SlidesContentValidationError, match="placeholder"):
            validate_slides_content(content, outline)

    def test_bullet_too_short_raises(self):
        outline = _outline(3)
        content = _valid_content(outline)
        content[1]["bullets"][0] = "Zu kurz"
        with pytest.raises(SlidesContentValidationError, match="word"):
            validate_slides_content(content, outline)

    def test_examples_on_title_slide_raises(self):
        outline = _outline(3)
        content = _valid_content(outline)
        content[0]["examples"] = ["Unerlaubtes Beispiel"]
        with pytest.raises(SlidesContentValidationError, match="examples"):
            validate_slides_content(content, outline)

    def test_too_few_content_slides_with_examples_raises(self):
        """Mindestens 30 % der content-Slides brauchen ein Beispiel."""
        outline = _outline(5)  # 3 content-Slides → ceil(3*0.3)=1 mit Beispiel nötig
        content = _valid_content(outline)
        # Alle Beispiele entfernen
        for slide in content:
            slide["examples"] = []
        with pytest.raises(SlidesContentValidationError, match="examples"):
            validate_slides_content(content, outline)


# ===========================================================================
# validate_slides_improve
# ===========================================================================

class TestSlidesImproveValidator:

    def _original(self):
        outline = _outline(3)
        return _valid_content(outline)  # alle content-Slides haben Beispiele

    def _improved(self):
        """Kopie des Originals – behält Bullets (≥8 Wörter) und Beispiele."""
        return [
            _content_slide(s["position"], s["slide_type"], s["title"],
                           examples=list(s.get("examples", [])))
            for s in self._original()
        ]

    def test_valid_improve(self):
        orig = self._original()
        imp = self._improved()
        validate_slides_improve(imp, orig)

    def test_count_mismatch_raises(self):
        orig = self._original()
        with pytest.raises(SlidesImproveValidationError, match="same number"):
            validate_slides_improve(self._improved()[:1], orig)

    def test_position_change_raises(self):
        orig = self._original()
        imp = self._improved()
        imp[0]["position"] = 99
        with pytest.raises(SlidesImproveValidationError, match="position"):
            validate_slides_improve(imp, orig)

    def test_slide_type_change_raises(self):
        orig = self._original()
        imp = self._improved()
        imp[0]["slide_type"] = "content"
        with pytest.raises(SlidesImproveValidationError, match="slide_type"):
            validate_slides_improve(imp, orig)

    def test_empty_title_raises(self):
        orig = self._original()
        imp = self._improved()
        imp[0]["title"] = "   "
        with pytest.raises(SlidesImproveValidationError, match="title"):
            validate_slides_improve(imp, orig)

    def test_placeholder_bullet_raises(self):
        orig = self._original()
        imp = self._improved()
        imp[1]["bullets"][0] = "todo"
        with pytest.raises(SlidesImproveValidationError, match="placeholder"):
            validate_slides_improve(imp, orig)

    def test_bullet_count_change_too_large_raises(self):
        orig = self._original()
        imp = self._improved()
        # Mehr als ±1 Bullet hinzufügen
        imp[1]["bullets"] = imp[1]["bullets"] + [
            "Ein zusätzlicher langer Bullet über ein wichtiges Thema",
            "Noch ein weiterer Bullet mit ausreichend vielen Wörtern hier",
            "Und noch ein weiterer vollständiger deklarativer Satz mit Verb",
        ]
        with pytest.raises(SlidesImproveValidationError, match="bullet count"):
            validate_slides_improve(imp, orig)

    def test_examples_removed_raises(self):
        """Existierende Beispiele dürfen nicht vollständig entfernt werden."""
        orig = self._original()
        imp = self._improved()
        # Ersten content-Slide im improved: Beispiele entfernen
        # (Original hat dort mind. 1 Beispiel durch _valid_content)
        for i, slide in enumerate(imp):
            if slide["slide_type"] == "content":
                assert orig[i]["examples"], "Setup-Fehler: Original hat kein Beispiel"
                slide["examples"] = []
                break
        with pytest.raises(SlidesImproveValidationError, match="examples"):
            validate_slides_improve(imp, orig)
