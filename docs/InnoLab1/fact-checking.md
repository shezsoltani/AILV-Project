# Fact-Checking: Testplan und Ergebnisse (SCRUM-16 Folgeticket)

Format, Statuswerte und Regeln: siehe Epic SCRUM-62.
Testunterlagen: `backend/tests/fixtures/fact_check/` (aus SCRUM-66).

## Testplan

| Nr | Fall | Vorgehen | Erwartung |
|----|------|----------|-----------|
| T1 | PDF als Kontext | PDF hochladen, Fragen generieren, speichern, im Archiv abrufen | Jede Frage hat genau ein Ergebnis. Zitate kommen wörtlich im PDF-Text vor. Status passt zur Frage. |
| T2 | Manueller Kontext | `context_text` eingeben, sonst wie T1 | wie T1 |
| T3 | Ohne Kontext | Weder `context_text` noch Upload | Prüfung wird übersprungen, Generierung läuft normal durch, kein Fehler. |
| T4 | Thema passt nicht zu den Unterlagen | Thema bewusst abweichend wählen (z. B. Unterlagen zu Photosynthese, Thema "Mittelalter") | Viele Fragen `not_supported`, keine Zitate bei diesen. |
| T5 | Mehr als 10 Fragen | 25 Fragen anfordern | Mehrere Batches. Am Ende hat jede Frage ein Ergebnis, keine doppelt, keine fehlt. |
| T6 | Prüfung schlägt fehl | Ollama während der Prüfung beenden (`docker stop` bzw. Prozess beenden) | Fragen werden trotzdem gespeichert, Prüfstatus `not_checked`, Auftrag bricht nicht ab. |
| T7 | Falsche Modellantwort (optional) | Falls reproduzierbar: Modell liefert erfundene Zitate | Validator lehnt ab, Modell wird erneut gefragt (Wiederholung sichtbar in `prompts`). |

## Durchführung pro Lauf

1. Fragen über die Website oder Swagger (`/docs`) generieren und speichern.
2. Ergebnis ansehen: `GET /api/jobs/{id}`, Netzwerk-Tab des Browsers oder Datenbank.
3. Im Archiv abrufen und prüfen, dass das Prüfergebnis mitgespeichert ist (SCRUM-63).
4. Zahlen notieren (siehe Auswertung unten).

### Status zählen

```bash
curl -s http://localhost:8000/api/jobs/<JOB_ID> \
 | jq '[.. | objects | select(has("status") and has("evidence")) | .status]
       | group_by(.) | map({(.[0]): length}) | add'
```

### Wiederholungen und Dauer (lokale DB, nicht die FH-Datenbank)

```sql
SELECT stage,
       count(*)        AS modellaufrufe,
       min(created_at) AS start,
       max(created_at) AS ende
FROM prompts
WHERE request_id = '<REQUEST_ID>'
GROUP BY stage
ORDER BY min(created_at);
```

Wiederholungen der Prüfung = Anzahl Aufrufe der Fact-Check-Stufe minus Anzahl Batches.
Dauer = Ende minus Start über alle Stufen des Auftrags (Stufenname in der Tabelle nachsehen).

### Zitate wörtlich prüfen

Die Prüfung aus dem Validator wiederverwenden, nicht von Hand vergleichen:

```python
from app.services.validators.fact_check_validator import normalize_text
kontext = normalize_text(open("unterlagen.txt", encoding="utf-8").read())
for z in zitate:
    print(normalize_text(z) in kontext, "|", z[:60])
```

## Ergebnisse

| Fall | Modell | Fragen | supported | partially_supported | not_supported | not_checked | Zitate wörtlich | Wiederholungen | Dauer |
|------|--------|--------|-----------|---------------------|---------------|-------------|-----------------|----------------|-------|
| T1 | Ollama (Modell eintragen) | | | | | | | | |
| T1 | OpenAI (falls Key) | | | | | | | | |
| T2 | Ollama | | | | | | | | |
| T3 | Ollama | | | | | | | | |
| T4 | Ollama | | | | | | | | |
| T5 | Ollama | | | | | | | | |
| T6 | Ollama | | | | | | | | |

## Stichprobe von Hand (mit erwarteten Ergebnissen aus SCRUM-66)

| Frage | Erwartet | KI-Ergebnis | Stimmt? | Bemerkung |
|-------|----------|-------------|---------|-----------|
| | | | | |

Trefferquote: _ von _ Fragen stimmen mit der Erwartung überein.

## Gefundene Fehler

| Nr | Beschreibung | Schritte zum Nachstellen | Ticket | Nach Behebung erneut geprüft |
|----|--------------|--------------------------|--------|------------------------------|
| | | | | |

## Einschränkungen

- (z. B. Anzeige im Frontend erst Sprint 4)
- (z. B. kleine lokale Modelle erfinden öfter Zitate)
- (z. B. OpenAI nicht getestet, kein Key)