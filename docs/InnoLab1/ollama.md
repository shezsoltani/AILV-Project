# Ollama einrichten und für die Fragengenerierung nutzen (SCRUM-31 / SCRUM-5)

## Aufbau und Stand

Die Anwendung läuft mit Frontend, Backend und PostgreSQL in Docker Desktop.
Ollama wird separat unter Windows installiert. Das Modell wird auf dem jeweiligen
Rechner heruntergeladen und nicht im Git-Repository gespeichert.

Stand 29.10.2026: Ollama ist an die dreistufige Fragengenerierung angebunden.
Ein kleiner Auftrag mit `qwen3:8b` lief über die Backend-API erfolgreich durch
SKELETON, CONTENT und IMPROVE. Das Auswahlfeld auf der Website folgt in SCRUM-32.

## Voraussetzungen

- Docker Desktop mit Linux-Containern läuft.
- Ollama für Windows ist installiert: https://ollama.com/download/windows
- Genügend Speicher für Programm und Modell. `qwen3:8b` benötigt etwa 5,2 GB
  Download; während der Ausführung wird zusätzlicher Arbeitsspeicher benötigt.
- Die GPU-Beschleunigung muss auf dem jeweiligen Rechner geprüft werden.

## Modell herunterladen und Ollama starten

Ollama über das Startmenü öffnen. Das Fenster muss nicht dauerhaft offen bleiben,
der Hintergrunddienst muss jedoch laufen. In einer neuen PowerShell:

```powershell
ollama --version
ollama pull qwen3:8b
ollama list
```

Der Download ist nur einmal nötig. Spätere Anfragen laden das gespeicherte Modell
bei Bedarf in den Speicher. Docker startet die Windows-Anwendung Ollama nicht mit.
Zum Beenden des Diensts das Ollama-Symbol im Infobereich der Taskleiste verwenden.

## Verbindung aus dem Backend prüfen

Unter Windows ist Ollama unter `http://localhost:11434` erreichbar. Aus dem
Docker-Desktop-Container wird `http://host.docker.internal:11434` verwendet.
`localhost` im Container würde den Container selbst bezeichnen.

```powershell
docker compose exec -T backend curl --fail --silent --show-error --max-time 15 http://host.docker.internal:11434/api/version
```

Kurze Modellanfrage aus demselben Container:

```powershell
'{"model":"qwen3:8b","prompt":"Antworte auf Deutsch in einem Satz: Was ist eine Datenbank?","stream":false,"think":false,"keep_alive":"5m","options":{"num_ctx":4096,"num_predict":100,"temperature":0}}' | docker compose exec -T backend curl --fail --silent --show-error --max-time 120 -H 'Content-Type: application/json' --data-binary '@-' http://host.docker.internal:11434/api/generate
```

`stream=false` liefert die Antwort am Stück. `think=false` deaktiviert für diesen
einfachen Test den zusätzlichen Denkmodus. `num_ctx=4096` begrenzt den Kontext,
`num_predict=100` die Antwortlänge. Diese Werte sind Testeinstellungen, noch keine
Einstellungen der Fragenpipeline.

## Fragengenerierung mit Ollama (SCRUM-5)

In der lokalen `.env` Ollama freischalten und die erlaubten Modelle festlegen:

```dotenv
OLLAMA_ENABLED=true
OLLAMA_MODELS=qwen3:8b
```

Danach `docker compose up -d backend` ausführen. Ollama muss zusätzlich unter
Windows laufen. Standardmäßig verwendet das Backend die Adresse
`http://host.docker.internal:11434` und ein Zeitlimit von 120 Sekunden pro
Modellanfrage. Beides lässt sich über `OLLAMA_BASE_URL` und
`OLLAMA_TIMEOUT_SECONDS` ändern. Weitere Modelle können kommagetrennt freigegeben
werden; sie müssen in Ollama installiert sein. Ohne Freischaltung bleibt Ollama
deaktiviert, etwa auf einem Server ohne lokalen KI-Dienst.

Ein angemeldeter Nutzer kann über `POST /api/generate` beispielsweise senden:

```json
{
  "topic": "Grundlagen relationaler Datenbanken",
  "count": 1,
  "types": ["SCQ"],
  "provider": "ollama",
  "model": "qwen3:8b"
}
```

Die Antwort enthält die `job_id`. Über `GET /api/jobs/{job_id}` lassen sich
Fortschritt, Ergebnis oder Fehler abrufen. Alle Aufrufe benötigen das Anmeldetoken
im Header `Authorization: Bearer <Token>`.

Anbieter und Modell werden mit dem Auftrag gespeichert und für alle Batches und
Stufen beibehalten. Ohne Auswahl bleibt OpenAI der Standard. Bei einem Ollama-Fehler
erfolgt kein automatischer Wechsel zu OpenAI.

`GET /api/generation/models` liefert die freigegebenen Modelle samt Verfügbarkeit
für das spätere Auswahlfeld. Bei Ollama werden Erreichbarkeit und installierte
Modelle geprüft. Bei OpenAI wird nur geprüft, ob ein API-Key hinterlegt ist.
Weitere API-Details stehen in [api.md](../api.md).

### Prüfung

Am 29.10.2026 bestanden 230 Backend-Tests, einschließlich der Tests für Provider,
Auswahl und Weitergabe. Zusätzlich wurde eine einzelne SCQ-Frage mit `qwen3:8b`
über die echte API generiert und als Auftragsergebnis gespeichert. Für einen
Eintrag im Archiv ist anschließend das normale Abschließen/Speichern nötig.
Ein echter OpenAI-Aufruf und die noch fehlende Website-Auswahl wurden nicht getestet.

Die neuen automatisierten Tests liegen in
`backend/tests/unit/test_ollama_provider.py` und
`backend/tests/unit/test_llm_selection.py`. Sie laufen ohne echte KI-Aufrufe in
der bestehenden Testsuite:

```powershell
docker compose -f backend/compose.test.yml run --rm tests -q
```

## GPU prüfen und gemessenes Ergebnis

Direkt nach einer Modellanfrage in PowerShell ausführen:

```powershell
ollama ps
```

`100% GPU` bedeutet, dass das Modell vollständig auf der GPU geladen ist, nicht
dass die GPU dauerhaft zu 100 Prozent ausgelastet ist. Die konkrete GPU und das
verwendete Verfahren stehen in `%LOCALAPPDATA%\Ollama\server.log`.

Getestete Konfiguration und Ergebnisse:

| Punkt                       | Ergebnis                                                             |
| --------------------------- | -------------------------------------------------------------------- |
| Ollama                      | 0.40.12                                                              |
| Modell                      | qwen3:8b, ID 500a1f067a9f                                            |
| Grafikkarte                 | AMD Radeon RX 9070 XT, ca. 15,9 GiB Grafikspeicher                   |
| Treiberversion laut Windows | 32.0.32015.7029                                                      |
| Beschleunigung              | ROCm automatisch gewählt; 37/37 Schichten auf der GPU                |
| Kontext beim Test           | 4096 Tokens                                                          |
| Windows-Test                | Deutsche Antwort erfolgreich; ca. 6,85 s einschließlich 6,33 s Laden |
| Container-Test              | Deutsche Antwort erfolgreich; ca. 7,10 s einschließlich 6,59 s Laden |

Es war keine manuelle Vulkan-Konfiguration und keine Änderung an Ollamas
Netzwerkbindung nötig. Diese Einzelergebnisse sind kein Qualitätsbenchmark und
keine Garantie für andere Hardware. Ein CPU-Fallback wurde nicht getestet, da die
GPU-Beschleunigung funktionierte.

## Fehler eingrenzen

- `ollama` nicht gefunden: nach Installation ein neues Terminal öffnen; alternativ
  `%LOCALAPPDATA%\Programs\Ollama\ollama.exe` verwenden.
- Verbindung verweigert: Ollama starten und zuerst die Versionsabfrage unter
  `http://localhost:11434/api/version` auf Windows prüfen.
- Modell fehlt: `ollama list` prüfen und den exakten Namen herunterladen.
- Windows funktioniert, Container nicht: Docker Desktop und die Adresse
  `host.docker.internal` prüfen. Netzwerkeinstellungen nicht pauschal ändern.
- Langsame erste Antwort: Ladezeit und eigentliche Antwortzeit unterscheiden.
- `ollama ps` ist leer: Das Modell wurde noch nicht geladen oder nach der Haltezeit
  entladen. Eine neue Anfrage senden und direkt danach erneut prüfen.

Beim ersten Projektstart wurden zwei bestehende Startprobleme behoben:
Das Frontend verwendet jetzt Node 22 und `npm ci` mit der vorhandenen Lockdatei.
Die Docker-Datenbank-URL nennt ausdrücklich den installierten Treiber `psycopg2`.
