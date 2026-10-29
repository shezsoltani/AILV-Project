# Ollama lokal einrichten (SCRUM-31)

## Aufbau und Stand

Die Anwendung läuft mit Frontend, Backend und PostgreSQL in Docker Desktop.
Ollama wird separat unter Windows installiert. Das Modell wird auf dem jeweiligen
Rechner heruntergeladen und nicht im Git-Repository gespeichert.

Geprüft am 28.10.2026: Das Backend-Container-Netzwerk erreicht Ollama und eine
direkte Modellanfrage liefert eine Antwort. Die Anwendung selbst verwendet noch
keinen Ollama-Provider; dessen Einbindung erfolgt in SCRUM-5, die Auswahl in der
Oberfläche in SCRUM-32. Dieser Verbindungstest prüft noch nicht die drei Stufen.

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
Festlegung für die spätere Fragenpipeline.

## GPU prüfen und gemessenes Ergebnis

Direkt nach einer Modellanfrage in PowerShell ausführen:

```powershell
ollama ps
```

`100% GPU` bedeutet, dass das Modell vollständig auf der GPU geladen ist, nicht
dass die GPU dauerhaft zu 100 Prozent ausgelastet ist. Die konkrete GPU und das
verwendete Verfahren stehen in `%LOCALAPPDATA%\Ollama\server.log`.

Getestete Konfiguration und Ergebnisse:

| Punkt | Ergebnis |
|---|---|
| Ollama | 0.40.12 |
| Modell | qwen3:8b, ID 500a1f067a9f |
| Grafikkarte | AMD Radeon RX 9070 XT, ca. 15,9 GiB Grafikspeicher |
| Treiberversion laut Windows | 32.0.32015.7029 |
| Beschleunigung | ROCm automatisch gewählt; 37/37 Schichten auf der GPU |
| Kontext beim Test | 4096 Tokens |
| Windows-Test | Deutsche Antwort erfolgreich; ca. 6,85 s einschließlich 6,33 s Laden |
| Container-Test | Deutsche Antwort erfolgreich; ca. 7,10 s einschließlich 6,59 s Laden |

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

## Referenzen

- https://docs.ollama.com/windows
- https://docs.ollama.com/gpu
- https://docs.ollama.com/api/generate
- https://ollama.com/library/qwen3:8b
