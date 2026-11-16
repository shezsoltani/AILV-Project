# Lokale KI-Modelle mit Ollama

Mit Ollama können Fragen statt über OpenAI mit einem KI-Modell auf dem eigenen
Rechner generiert werden. Das spart API-Kosten bei Entwicklung und Tests.

**Stand (11.11.2026):** Für die Fragengenerierung fertig (Epic SCRUM-29 mit
SCRUM-31, SCRUM-5, SCRUM-32, SCRUM-33). Im Formular lassen sich Anbieter und
Modell auswählen. Ein Auftrag mit `qwen3:8b` läuft durch alle drei Stufen, die
Fragen lassen sich speichern und erscheinen im Archiv.

## Was ist Ollama?

Ollama ist ein Programm, das KI-Modelle lokal ausführt. Es läuft im Hintergrund
wie ein kleiner Server unter `http://localhost:11434`. Man schickt einen Prompt
und bekommt Text zurück, wie bei OpenAI, nur ohne Cloud und ohne Kosten pro
Anfrage. Ein Modell wird einmal heruntergeladen (`ollama pull qwen3:8b`) und
liegt dann auf der Festplatte, nicht im Git-Repository.

## Wie es in AILV eingebaut ist

Am Kern der Anwendung musste fast nichts geändert werden: Die drei Stufen
(SKELETON, CONTENT, IMPROVE), die Prompts, die Validatoren und die
Wiederholungen bei Fehlern sind gleich geblieben.

Das ging, weil es bereits eine gemeinsame Schnittstelle gab: `LLMProvider` mit
einer Methode `complete(prompt) -> str`. OpenAI war bisher die einzige
Umsetzung. Ollama ist jetzt eine zweite. Die Pipeline merkt nicht, mit wem sie
redet.

| Wo | Was |
|---|---|
| `backend/app/services/ollama_provider.py` (neu) | Schickt den Prompt an Ollama (`POST /api/generate`) und gibt die Antwort zurück. Verständliche Fehlermeldungen („nicht erreichbar“, „Modell nicht gefunden“) und Zeitlimit. |
| `backend/app/services/llm_selection.py` (neu) | Der „Türsteher“: prüft, ob Anbieter und Modell freigegeben sind, und erzeugt den passenden Provider. Liefert auch die Modellliste für das Formular. |
| `backend/app/models/generate_models.py` | `GenerateRequest` hat zwei neue Felder: `provider` (`openai` oder `ollama`, Standard `openai`) und `model`. |
| `batch_runner.py`, `orchestrator.py`, Stufen-Services | Erzeugen den Provider einmal pro Auftrag und reichen ihn durch alle Batches und Stufen weiter, statt fest OpenAI zu verwenden. |
| `backend/app/api/routes_generate.py` | Neuer Endpunkt `GET /api/generation/models`. |
| `backend/app/config.py`, `.env`, `docker-compose.yml` | Neue Einstellungen `OLLAMA_*` (siehe unten). |
| Frontend (`GenerateForm.tsx`, `useGenerateForm.ts`, `generationModelsApi.ts`, `questionsApi.ts`) | Auswahlfelder „KI-Anbieter“ und „Modell“; die Auswahl wird beim Generieren mitgeschickt. |

Das Backend läuft in Docker, Ollama direkt unter Windows. Aus dem Container ist
der eigene Rechner deshalb unter `http://host.docker.internal:11434` erreichbar,
nicht unter `localhost` (das wäre der Container selbst).

Einstellungen für die Ollama-Anfrage: `stream: false` (Antwort am Stück),
`think: false` (Denkmodus von Qwen3 aus, schneller), `temperature: 0.7` (wie bei
OpenAI), Modell bleibt 5 Minuten im Speicher (`keep_alive`).

## Welche Modelle auswählbar sind

```
Browser  ->  Backend: GET /api/generation/models  ->  Ollama: GET /api/tags
```

1. Das Formular fragt nur das Backend, nie Ollama direkt.
2. Das Backend vergleicht zwei Listen:
   - **Freigegeben:** `OLLAMA_MODELS` in der `.env`, festgelegt vom Betreiber.
   - **Installiert:** was Ollama unter `/api/tags` meldet.
3. Auswählbar ist ein Modell nur, wenn es auf **beiden** Listen steht. Sonst
   zeigt das Formular es als „nicht verfügbar“ mit Begründung an
   („Modell ist nicht installiert“ bzw. „Ollama ist nicht erreichbar …“).
4. Beim Generieren prüft das Backend erneut. Ein nicht freigegebener Anbieter
   oder ein nicht freigegebenes Modell ergibt HTTP 422.
5. Mit `OLLAMA_ENABLED=false` erscheint Ollama gar nicht in der Liste. Für
   OpenAI wird nur geprüft, ob ein API-Key hinterlegt ist.

Die Auswahl wird mit dem Auftrag gespeichert. Fällt Ollama während der
Generierung aus, schlägt der Auftrag mit einer Meldung fehl. Es gibt keinen
automatischen Wechsel zu OpenAI.

## Einrichten

1. Ollama für Windows installieren: https://ollama.com/download/windows
2. In einer neuen PowerShell das Modell laden:
   ```powershell
   ollama pull qwen3:8b
   ollama list
   ```
3. In der lokalen `.env`:
   ```dotenv
   OLLAMA_ENABLED=true
   OLLAMA_MODELS=qwen3:8b
   # optional, Standardwerte:
   # OLLAMA_BASE_URL=http://host.docker.internal:11434
   # OLLAMA_TIMEOUT_SECONDS=120
   ```
4. Backend neu starten: `docker compose up -d backend`
5. Ollama muss während der Generierung laufen. Docker startet es nicht mit.
6. Im Formular „Ollama (lokal)“ und das Modell auswählen.

Weitere Modelle: mit `ollama pull <name>` laden und in `OLLAMA_MODELS`
kommagetrennt ergänzen, z. B. `OLLAMA_MODELS=qwen3:8b,<weiteres-modell>`.

## Welches Modell passt?

In der App wird nichts automatisch erkannt. Welches Modell sinnvoll ist, hängt
vor allem vom Grafikspeicher (VRAM) ab. Grobe Faustwerte, nicht für jeden
Rechner gemessen:

| Modellgröße | ungefähr nötig |
|---|---|
| ~8 Mrd. Parameter („8b“), z. B. `qwen3:8b` | ~6 GB VRAM |
| ~14 Mrd. | ~10–12 GB VRAM |
| ~30 Mrd. und mehr | 20 GB VRAM und mehr |

Ohne passende Grafikkarte läuft das Modell auf dem Prozessor, das ist deutlich
langsamer. Für AILV zählen außerdem:

- **Gutes Deutsch:** Nicht jedes kleine Modell schreibt gut Deutsch. Qwen3 ist
  bei mehreren Sprachen recht solide.
- **Sauberes JSON:** Die Validatoren verlangen ein genaues Format. Kleine Modelle
  brauchen dafür öfter einen zweiten Versuch.

Ob die Grafikkarte genutzt wird, zeigt `ollama ps` direkt nach einer Anfrage
(`100% GPU` = Modell vollständig auf der GPU).

Gemessene Konfiguration (SCRUM-31, 29.10.2026):

| Punkt | Ergebnis |
|---|---|
| Modell | `qwen3:8b` (ca. 5,2 GB Download) |
| Grafikkarte | AMD Radeon RX 9070 XT, ca. 16 GB, ROCm automatisch, alle Schichten auf der GPU |
| Einzelne Antwort | ca. 7 s, davon ca. 6,5 s Laden des Modells |
| Auftrag mit 2 Fragen über die Website (11.11.2026) | ca. 18 s |

## Ollama oder GPT-4o?

Ollama ist für **Entwicklung und Tests ohne API-Kosten** gedacht. Für Fragen,
die Lehrende tatsächlich verwenden, ist GPT-4o deutlich stärker:

- `qwen3:8b` ist ein sehr kleines Modell, GPT-4o um ein Vielfaches größer.
- Typische Unterschiede: einfachere Fragen, leichter durchschaubare falsche
  Antwortoptionen, häufiger sachliche Fehler, holprigeres Deutsch und mehr
  Wiederholungen wegen Formatfehlern.
- Beispiel: Beim Testlauf am 11.11.2026 waren die zwei Fragen in Ordnung, die
  erste Stufe (SKELETON) brauchte aber einen zweiten Versuch.
- `think: false` macht die Antworten schneller, kostet aber etwas Qualität.

Belastbare Zahlen liefert erst der geplante Vergleich Ollama gegen GPT-4o in
Sprint 5 (Genauigkeit, Antwortzeit, Fehlerrate, Kosten).

## Grenzen

- Nur die **Fragengenerierung** nutzt Ollama. Die Foliengenerierung läuft
  weiterhin über OpenAI.
- Auf dem **FH-Server** ist Ollama nicht eingerichtet (`OLLAMA_ENABLED=false`).
- Das Formular wählt zu Beginn immer OpenAI vor, auch wenn dafür kein Key
  hinterlegt ist und nur Ollama verfügbar wäre.

## Tests

Die Backend-Tests laufen ohne echte KI-Aufrufe:

- `backend/tests/unit/test_ollama_provider.py`: Anfrage, Antworten und Fehler
  des Ollama-Providers
- `backend/tests/unit/test_llm_selection.py`: Freigabe, Auswahl und Modellliste

```powershell
docker compose -f backend/compose.test.yml run --rm tests -q
```

Für die Auswahlfelder im Frontend gibt es noch keine eigenen Tests.

## Fehler eingrenzen

| Problem | Lösung |
|---|---|
| `ollama` nicht gefunden | Neues Terminal öffnen oder `%LOCALAPPDATA%\Programs\Ollama\ollama.exe` verwenden. |
| „Ollama ist nicht erreichbar“ | Ollama starten; `http://localhost:11434/api/version` im Browser prüfen. |
| „Modell ist nicht installiert“ | `ollama list` prüfen und den exakten Namen aus `OLLAMA_MODELS` mit `ollama pull` laden. |
| Unter Windows erreichbar, aus Docker nicht | `docker compose exec backend curl http://host.docker.internal:11434/api/version` |
| Ollama erscheint nicht im Formular | `OLLAMA_ENABLED=true` in der `.env` und Backend neu starten. |
| Erste Antwort sehr langsam | Das Modell wird erst geladen; danach bleibt es 5 Minuten im Speicher. |

API-Details: [api.md](api.md)
