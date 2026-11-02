"""
Unit-Tests für die Template-Verarbeitung (render_template()).
Kein Datenbankzugriff, keine Netzwerkverbindung nötig.

get_template_by_stage() ist absichtlich nicht Teil dieser Tests
(wird später durch Integration Tests abgedeckt).
"""

import pytest

from app.services.templateService import render_template
from app.core.exceptions import TemplateRenderError


class TestRenderTemplateSuccess:

    def test_render_with_full_context(self):
        result = render_template(
            "Hallo {{ name }}, dein Thema ist {{ topic }}.",
            {"name": "Anna", "topic": "Mathematik"},
        )
        assert result == "Hallo Anna, dein Thema ist Mathematik."

    def test_render_multiple_placeholders(self):
        result = render_template(
            "{{ a }}-{{ b }}-{{ c }}",
            {"a": "1", "b": "2", "c": "3"},
        )
        assert result == "1-2-3"

    def test_render_ignores_unused_context_values(self):
        result = render_template(
            "Thema: {{ topic }}",
            {"topic": "Physik", "unused": "wird ignoriert"},
        )
        assert result == "Thema: Physik"


class TestRenderTemplateMissingContext:

    def test_missing_context_value_raises_template_render_error(self):
        with pytest.raises(TemplateRenderError):
            render_template("Hallo {{ name }}", {})

    def test_missing_context_value_error_mentions_variable(self):
        with pytest.raises(TemplateRenderError) as exc:
            render_template("Hallo {{ name }}", {})
        assert "name" in exc.value.detail

    def test_partial_context_missing_one_value_raises(self):
        with pytest.raises(TemplateRenderError):
            render_template("{{ a }}-{{ b }}", {"a": "1"})


class TestRenderTemplateInvalidSyntax:

    def test_invalid_jinja_syntax_raises_template_render_error(self):
        with pytest.raises(TemplateRenderError):
            render_template("{% if missing_endif %}Text", {})

    def test_unclosed_expression_raises_template_render_error(self):
        with pytest.raises(TemplateRenderError):
            render_template("{{ unclosed", {})

    def test_syntax_error_is_exactly_template_render_error_type(self):
        with pytest.raises(TemplateRenderError) as exc:
            render_template("{% for x in items %}", {})
        assert isinstance(exc.value, TemplateRenderError)


class TestRenderTemplateEmpty:

    def test_empty_template_renders_empty_string(self):
        result = render_template("", {"irrelevant": "wert"})
        assert result == ""

    def test_empty_context_without_placeholders_renders_unchanged(self):
        result = render_template("Statischer Text ohne Platzhalter.", {})
        assert result == "Statischer Text ohne Platzhalter."


class TestRenderTemplateSpecialContent:

    def test_special_characters_are_rendered_unescaped(self):
        result = render_template(
            "Preis: {{ price }} € – 100% sicher? <b>&wichtig</b>",
            {"price": "9,99"},
        )
        assert result == "Preis: 9,99 € – 100% sicher? <b>&wichtig</b>"

    def test_multiline_template_preserves_line_breaks(self):
        template = "Zeile 1: {{ a }}\nZeile 2: {{ b }}\nZeile 3: Ende"
        result = render_template(template, {"a": "Eins", "b": "Zwei"})
        assert result == "Zeile 1: Eins\nZeile 2: Zwei\nZeile 3: Ende"

    def test_multiline_context_value_preserves_line_breaks(self):
        context_value = "Erste Zeile\nZweite Zeile"
        result = render_template("Kontext:\n{{ text }}", {"text": context_value})
        assert result == "Kontext:\nErste Zeile\nZweite Zeile"
