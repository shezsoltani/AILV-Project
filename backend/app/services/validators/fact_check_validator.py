import re
from typing import Iterable

from ...core.exceptions import FactCheckValidationError

ALLOWED_STATUS = ("supported", "partially_supported", "not_supported")
MIN_QUOTE_LENGTH = 15

# Verschiedene Anführungszeichen und Striche werden vor dem Vergleich vereinheitlicht.
_QUOTE_TRANSLATION = str.maketrans(
    {
        "„": '"', "“": '"', "”": '"', "‟": '"', "«": '"', "»": '"', "″": '"',
        "‚": "'", "‘": "'", "’": "'", "‛": "'", "‹": "'", "›": "'", "`": "'", "´": "'", "′": "'",
        "–": "-", "—": "-", "−": "-",
    }
)


def normalize_text(text: str) -> str:
    """Vereinheitlicht Text für den Zitat-Vergleich.

    - Anführungszeichen und Striche werden gleich behandelt
    - Whitespace (Leerzeichen, Tabs, Zeilenumbrüche) wird zu einem Leerzeichen
    - Groß-/Kleinschreibung wird ignoriert
    """
    text = text.translate(_QUOTE_TRANSLATION)
    text = re.sub(r"\s+", " ", text)
    return text.strip().casefold()


def _build_context(context) -> str:
    if context is None:
        return ""
    if isinstance(context, str):
        return normalize_text(context)
    if isinstance(context, Iterable):
        parts = [c for c in context if isinstance(c, str) and c.strip()]
        return normalize_text(" ".join(parts))
    return ""


def validate_fact_check(results, questions, context):
    """Prüft das Ergebnis der Faktencheck-Stufe.

    results:   Liste der Modell-Ergebnisse (id, status, evidence, note)
    questions: Liste der Fragen (jeweils mit 'id')
    context:   Text der Unterlagen (context_text + upload_context, als ein
               String oder als Liste von Strings)

    Wirft FactCheckValidationError mit einer verständlichen Meldung.
    """
    if not isinstance(results, list):
        raise FactCheckValidationError(
            "Die Antwort muss eine JSON-Liste mit einem Ergebnis pro Frage sein."
        )

    # --- Aufbau: genau ein Ergebnis pro Frage -------------------------------
    question_ids = [q.get("id") for q in questions]

    seen_ids = set()
    for i, item in enumerate(results, start=1):
        if not isinstance(item, dict):
            raise FactCheckValidationError(
                f"Eintrag {i} der Antwort ist kein Objekt."
            )
        rid = item.get("id")
        if rid not in question_ids:
            raise FactCheckValidationError(
                f"Eintrag {i} hat die id '{rid}', zu der es keine Frage gibt."
            )
        if rid in seen_ids:
            raise FactCheckValidationError(
                f"Für Frage {rid} gibt es mehr als ein Ergebnis. "
                "Es darf genau ein Ergebnis pro Frage geben."
            )
        seen_ids.add(rid)

    missing = [qid for qid in question_ids if qid not in seen_ids]
    if missing:
        names = ", ".join(str(m) for m in missing)
        raise FactCheckValidationError(
            f"Für die folgenden Fragen fehlt ein Ergebnis: {names}. "
            "Es muss genau ein Ergebnis pro Frage geben."
        )

    normalized_context = _build_context(context)

    # --- Inhalt je Ergebnis --------------------------------------------------
    for item in results:
        qid = item["id"]

        status = item.get("status")
        if status not in ALLOWED_STATUS:
            raise FactCheckValidationError(
                f"Frage {qid} hat den unbekannten Status '{status}'. "
                f"Erlaubt sind: {', '.join(ALLOWED_STATUS)}."
            )

        evidence = item.get("evidence")
        if not isinstance(evidence, list):
            raise FactCheckValidationError(
                f"Bei Frage {qid} muss 'evidence' eine Liste von Texten sein."
            )
        if not all(isinstance(e, str) for e in evidence):
            raise FactCheckValidationError(
                f"Bei Frage {qid} muss jedes Zitat in 'evidence' ein Text sein."
            )

        if not isinstance(item.get("note"), str):
            raise FactCheckValidationError(
                f"Bei Frage {qid} muss 'note' ein Text sein."
            )

        # Stimmigkeit von Status und Zitaten
        if status in ("supported", "partially_supported") and not evidence:
            raise FactCheckValidationError(
                f"Frage {qid} hat den Status '{status}', aber kein Zitat. "
                "Bei diesem Status muss mindestens ein Zitat aus den Unterlagen angegeben werden."
            )
        if status == "not_supported" and evidence:
            raise FactCheckValidationError(
                f"Frage {qid} hat den Status 'not_supported', aber es sind Zitate angegeben. "
                "Bei 'not_supported' muss 'evidence' leer sein."
            )

        # Zitate prüfen
        for quote in evidence:
            normalized_quote = normalize_text(quote)

            if len(normalized_quote) < MIN_QUOTE_LENGTH:
                raise FactCheckValidationError(
                    f"Das Zitat bei Frage {qid} ist zu kurz "
                    f"(mindestens {MIN_QUOTE_LENGTH} Zeichen). "
                    "Bitte ein längeres, zusammenhängendes Zitat verwenden."
                )

            if not normalized_context:
                raise FactCheckValidationError(
                    f"Das Zitat bei Frage {qid} kann nicht geprüft werden, "
                    "weil keine Unterlagen vorhanden sind. "
                    "Ohne Unterlagen darf kein Zitat angegeben werden."
                )

            if normalized_quote not in normalized_context:
                raise FactCheckValidationError(
                    f"Das Zitat bei Frage {qid} kommt in den Unterlagen nicht wörtlich vor. "
                    "Bitte nur Sätze oder Satzteile verwenden, die genau so in den Unterlagen stehen."
                )

    return results