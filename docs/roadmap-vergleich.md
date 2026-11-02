# Roadmap-Vergleich: Ursprüngliche Fassung und überarbeitete Fassung

Stand: 27.09.2026 · Grundlage: Code-Analyse auf Commit `f27dc81`

Dieses Dokument stellt die ursprüngliche Semester-Roadmap der überarbeiteten Fassung gegenüber. Jede Änderung ist mit dem Befund im Code begründet, aus dem sie folgt.

## Überblick

| | Ursprüngliche Fassung | Überarbeitete Fassung |
|---|---|---|
| Anzahl Sprints | 6 | 6 |
| Aufwand angegeben | nur Sprint 5 (38 Ph) | alle Sprints, gesamt ≈ 314 Ph (Spanne 280–355) |
| Reihenfolge Feature-Sprints | Themenpools (4), Freitext/Batch (5) | Freitext/Batch (4), Themenpools (5) |
| Sicherheitsmaßnahmen | nicht enthalten | Sprint 1, Woche 1 |
| Datenbankmigrationen | Sprint 6 | Sprint 1 |
| PostgreSQL-Testumgebung | Sprint 3 | Sprint 1 |
| CI-Pipeline | Sprint 3 | ab Sprint 1, Ausbau in Sprint 3 |
| Clean-Code-Leitlinien | nicht enthalten | eigener Abschnitt, gilt ab Sprint 2 |

## Zuordnung der Sprints

| Ursprünglich | Überarbeitet | Aufwand alt | Aufwand neu |
|---|---|---|---|
| 1 Testgrundlage und Qualitätsstrategie | 1 Fundament: Absicherung, Migrationen, Testbasis | – | 52 Ph (45–60) |
| 2 Gezieltes Refactoring und Unit Tests | 2 Gezieltes Refactoring und Unit Tests | – | 50 Ph (45–58) |
| 3 Integration Tests und Continuous Integration | 3 Integration Tests, CI-Ausbau und Job-Robustheit | – | 48 Ph (43–53) |
| 4 Themenbasierte Fragenpools | 5 Themenbasierte Fragenpools | – | 68 Ph (60–77) |
| 5 Freitextfolien und Batch-Optimierung | 4 Freitextfolien und Batch-Konfiguration | 38 Ph | 56 Ph (50–63) |
| 6 Stabilisierung, Deployment und Übergabe | 6 Stabilisierung, Deployment und Übergabe | – | 40 Ph (35–45) |

Die Aufwände sind Schätzungen aus Umfang und Kopplung der betroffenen Module, keine Messwerte.

---

## Sprint 1: Testgrundlage → Fundament

**Neu hinzugekommen**

| Änderung | Begründung |
|---|---|
| Security-Sofortmaßnahmen in Woche 1: Reset-Link konfigurierbar, Passwort-Mindestlänge bei Registrierung, Rate-Limit in nginx, Port 8000 schließen, Security-Header | Der Reset-Link ist fest auf `http://localhost:3000` gesetzt (`backend/app/core/email_utils.py:18`) und funktioniert in keiner anderen Umgebung. Die Registrierung prüft keine Passwortlänge (`auth_models.py:7`), Ändern und Zurücksetzen verlangen dagegen 8 Zeichen. Login, Registrierung und Passwort-Reset haben kein Rate-Limit. `docker-compose.prod.yml` gibt Port 8000 öffentlich frei, damit lässt sich nginx umgehen. `nginx.conf` setzt keine Security-Header. Die Maßnahmen sind klein und hängen nicht von Tests ab. |
| Python-Abhängigkeiten pinnen | Mehrere Pakete in `requirements.txt` sind ohne Version angegeben (u. a. SQLAlchemy, Jinja2, python-jose, pymupdf), `psycopg2-binary` steht doppelt drin. CI-Läufe wären sonst nicht reproduzierbar. |
| Alembic als Migrations-Tooling einführen | Das Schema entsteht nur aus `db-init/01_tables.sql`. Postgres führt diese Datei nur bei einem leeren Volume aus. Schemaänderungen aus den Feature-Sprints würden eine bestehende Datenbank nie erreichen. Die Prompt-Templates liegen ebenfalls in der Datenbank, Prompt-Änderungen sind also auch Datenmigrationen. |
| PostgreSQL-Testumgebung (aus Sprint 3 vorgezogen) | Das Schema nutzt JSONB, `uuid-ossp`, Löschkaskaden und CHECK-Constraints. SQLite oder Mocks würden anderes Verhalten testen. Sprint 2 braucht diese Umgebung bereits. |
| CI-Pipeline (aus Sprint 3 vorgezogen) | Das Refactoring in Sprint 2 braucht automatischen Regressionsschutz. Die 16 Frontend-Testdateien mit 56 Tests laufen bereits grün und können sofort in die CI. |

**Gestrichen**

| Änderung | Begründung |
|---|---|
| Dateisystem in Tests ersetzen | Das Backend schreibt keine Dateien. Der PDF-Upload wird aus dem Byte-Stream gelesen, PDF- und PPTX-Export laufen über `BytesIO` im Speicher. |

**Präzisiert**

- Die ersten Unit Tests decken konkret die neun Validator-Dateien, das Template-Rendering und die Batch-Aufteilung ab.
- Für das LLM wird das vorhandene `LLMProvider`-Interface genutzt. Ein Fake ist damit fast ohne Aufwand möglich.

---

## Sprint 2: Gezieltes Refactoring und Unit Tests

**Geändert**

| Ursprünglich | Überarbeitet | Begründung |
|---|---|---|
| Generierungslogik von LLM-, Datenbank- und Infrastrukturzugriffen trennen | Keine eigene Abstraktionsschicht für die Datenbank; Tests gegen echtes Postgres | Eine Datenbank-Abstraktion nur zum Mocken wäre teuer und würde das tatsächliche Schemaverhalten nicht prüfen. |
| Bestehendes LLM-Interface in den Generierungsabläufen verwenden | Nur noch die Injektion bis zum Job-Runner | Alle sechs Generierungsstufen laufen bereits über `stage_runner.run_stage` und das `LLMProvider`-Interface. |

**Neu hinzugekommen (Clean-Code-Refactoring)**

| Änderung | Begründung |
|---|---|
| Datenbank-Sessions für Jobs trennen | `db.py:9` nutzt `scoped_session`, also eine Session pro Thread. Hintergrund-Jobs laufen alle im selben Event-Loop-Thread. Gleichzeitige Jobs teilen sich deshalb vermutlich eine Session, und Commit, Rollback und Close eines Jobs wirken auf den anderen. Aus dem Code abgeleitet, noch nicht zur Laufzeit reproduziert. |
| Keine Nebenwirkungen beim Import | `config.py:78` liest beim Import die Umgebung und bricht ab, wenn Werte fehlen. E-Mail-Konfiguration und Datenbank-Engine entstehen ebenfalls beim Import. Tests können die Konfiguration so nicht pro Test steuern. |
| Services werfen nur Domain-Exceptions | Archiv-, Finalisierungs- und Auth-Services sowie die Request-Validatoren werfen `HTTPException`. Die Geschäftslogik hängt damit vom Web-Framework ab. Eine eigene Exception-Hierarchie mit zentralem Handler existiert bereits. |
| Ownership-Prüfung zentralisieren | Dieselbe Prüfung steht 16 Mal in 7 Dateien, teils in Routen, teils in Services. |
| Commits nur in den Services | 19 `db.commit()`-Aufrufe sind über Repositories und Services verteilt. Die Folien-Finalisierung (`slides_finalize_service.py:50-60`) committet in zwei Schritten und ist deshalb nicht atomar. |
| Fehler in `routes_archive_export.py:174` beheben | Dort wird einer Variable eine UUID statt eines Objekts zugewiesen. Der Fehler ist selten erreichbar, aber eindeutig. |
| Coverage in der CI | Baut auf der CI aus Sprint 1 auf. |

**Aufwand:** 50 Ph. Die ursprüngliche Fassung nennt keinen Wert; der Großteil des Aufwands entfällt auf die fünf Refactoring-Punkte und die Tests dafür.

---

## Sprint 3: Integration Tests und CI → Integration Tests, CI-Ausbau und Job-Robustheit

**Verschoben**

- Die PostgreSQL-Testumgebung und die Einrichtung der CI sind nach Sprint 1 gewandert. Sprint 3 baut die CI nur noch aus: Pflicht-Checks für Pull Requests, sichtbare Coverage, Migrationen in jedem Lauf.

**Neu hinzugekommen**

| Änderung | Begründung |
|---|---|
| Job-Robustheit | Jobs laufen als FastAPI-`BackgroundTasks` im Prozess. Nach einem Neustart bleiben laufende Jobs dauerhaft auf `running` stehen. `batch_runner.py` hat zwar Parameter zum Fortsetzen, aber kein Aufrufer nutzt sie. Ohne diese Lösung würde jedes automatische Deployment laufende Generierungen abbrechen. |
| Job-Status als Enum mit Zustand `cancelled` | `job_runner.py:13` erkennt einen Abbruch am exakten Text der Fehlermeldung. Eine Textänderung legt den Abbruch still. |
| Konkretere Testfälle | Passwort-Reset mit Ablauf und Einmalverwendung, jede ressourcenbezogene Route mit fremdem Nutzer, Löschkaskaden, Abbruch mitten im Batch. |

---

## Ursprünglicher Sprint 5 → neuer Sprint 4: Freitextfolien und Batch

**Reihenfolge:** vor die Themenpools gezogen.
Beide Features sind fachlich unabhängig: Freitext betrifft Folien, Themenpools betreffen Fragen. Freitext braucht die kleinere Migration (eine neue Spalte in `slides` plus Template-Anpassungen) und erprobt damit den Migrationsablauf, bevor der riskante Backfill der Themenpools kommt.

**Neu hinzugekommen**

| Änderung | Begründung |
|---|---|
| Erste echte Migration, Template-Anpassung als Datenmigration | Die Prompt-Templates liegen in der Tabelle `prompt_templates`. |
| Duplikate zwischen Fragen und Folien auflösen | `run_question_batches`/`run_slide_batches` und `run_questions_job`/`run_slides_job` sind fast identisch. Getrennte Batch-Größen für Fragen und Folien lassen sich in einer gemeinsamen Batch-Schleife sauberer umsetzen. |

**Präzisiert**

| Ursprünglich | Überarbeitet | Begründung |
|---|---|---|
| Generierungen mit 10, 25 und 50 Elementen vergleichen | Batch-Größen 10, 25 und 50 für Fragen; Folien bis 30 | `slide_count` ist auf 30 begrenzt (`slides_models.py:10`). 50 Folien bräuchten Änderungen im Backend und im Frontend-Validator. Zusätzlich wird der Tokenverbrauch gemessen. |
| Batch-Größe konfigurierbar machen | Bezug auf die konkrete Stelle | Heute `BATCH_SIZE = 10` in `batch_runner.py:11`, gemeinsam für Fragen und Folien. |

**Aufwand:** 56 Ph statt 38 Ph. Freitext betrifft Datenmodell, drei Prompt-Stufen, Validator, Vorschau, Bearbeitung, Archiv und Export. Dazu kommen Migration, Messreihe und das Zusammenführen der Batch-Logik.

---

## Ursprünglicher Sprint 4 → neuer Sprint 5: Themenbasierte Fragenpools

**Reihenfolge:** nach hinten verschoben. Der Sprint ist der größte und riskanteste, weil bestehende Archivdaten überführt werden. Er profitiert von Integration Tests, Job-Robustheit und einem bereits erprobten Migrationsablauf.

**Neu hinzugekommen**

| Änderung | Begründung |
|---|---|
| Strategie-Klasse pro Fragetyp vor der Pool-Logik | Die Fragetypen SCQ, MCQ, Kurzantwort und Wahr/Falsch stehen an 23 Stellen in 9 Dateien. Ein neuer Typ betrifft heute alle neun. Die Themenpools bauen auf genau dieser Schicht auf. |
| Backfill 1:1 und Test an einer Kopie der Produktionsdaten | Heute ist jede Generierungsanfrage die oberste Archiv-Einheit, es gibt keine Vorstufe eines Pools. Eine 1:1-Überführung ist die risikoärmste Variante. |
| Wiederholungen vermeiden | Beim Nachgenerieren sollen vorhandene Fragen des Pools berücksichtigt werden. |
| Export pro Pool | Folgt aus der Umstellung der Archivansicht. |
| Annahme: Pools gelten nur für Fragen | Muss im Team bestätigt werden. |

**Aufwand:** 68 Ph. Es gibt im Code keinen Ansatz für Themenpools; Datenmodell, Migration, Backfill, Frontend und Job-System müssen neu umgesetzt werden.

---

## Sprint 6: Stabilisierung, Deployment und Übergabe

**Verschoben**

- Die Migrationsstrategie ist nach Sprint 1 gewandert. Sprint 6 legt nur noch fest, wie Migrationen beim Deployment ausgeführt werden.
- Die Dokumentation entsteht laufend ab Sprint 1 und wird in Sprint 6 nur noch finalisiert.

**Neu hinzugekommen**

| Änderung | Begründung |
|---|---|
| Frontend-Image reproduzierbar bauen | `frontend/Dockerfile.prod` kopiert nur `package.json`, nicht die Lock-Datei, und nutzt Node 18, das nicht mehr unterstützt wird. |
| Token-Laufzeit aus der Konfiguration | Die JWT-Laufzeit ist fest auf 60 Minuten gesetzt (`auth_utils.py:33`). |
| Backups mit getesteter Wiederherstellung | Ein Backup ohne Wiederherstellungstest ist für eine Übergabe nicht belastbar. |
| Staging-Deployment baut auf `docker-compose.prod.yml` auf | Ein Produktions-Setup mit Healthchecks existiert bereits und muss nicht neu gebaut werden. |

---

## Neue Abschnitte ohne Gegenstück in der ursprünglichen Fassung

**Leitlinien für das Refactoring.** Acht Regeln für jede Backend-Änderung ab Sprint 2: Klassen für Zustand und Austauschbarkeit, Funktionen für reine Logik; Abhängigkeiten übergeben; keine Nebenwirkungen beim Import; klare Schichten; Erweiterung über Strategien; jede Regel an einer Stelle; Zustände als Enums; Refactoring nur mit Test. Ein vollständiger Umbau auf OOP ist bewusst nicht vorgesehen, weil Testbarkeit von Dependency Injection abhängt, nicht von Klassen.

**Bewusst zurückgestellt.**
- Enumeration bei der Registrierung: braucht einen E-Mail-Verifikationsflow (ca. 8–12 Ph).
- JWT im localStorage ohne Widerruf.
- Reset-Tokens im Klartext in der Datenbank.
- Kein Kostenkontingent pro Nutzer für LLM-Aufrufe.

**Annahmen und Risiken.**
- Der Rahmen von sechs Sprints ist fest.
- Ob die gehostete Instanz echte Nutzerdaten enthält, ist nicht geprüft.
- Der Ablauf der Reset-Tokens ist nur bei einer Datenbank in UTC korrekt.
- Das größte Einzelrisiko ist der Backfill der Themenpools.
- Falls das Budget nicht reicht, kann die Fragetyp-Strategie aus Sprint 5 nach Sprint 6 wandern.

---

## Offener Vorschlag, noch nicht in der Roadmap

**Continuous Delivery auf Staging früher einführen.** Beide Fassungen sehen ein automatisches Deployment auf Staging erst in Sprint 6 vor. Vorgeschlagen ist, es an das Ende von Sprint 3 zu ziehen (zusätzlich ca. 6–10 Ph). Dann werden die Migrationen aus Sprint 4 und 5 automatisch auf Staging ausgeführt, bevor sie die Produktion erreichen. Das Deployment in die Produktion bleibt in Sprint 6 und läuft mit manueller Freigabe. Voraussetzung ist eine Staging-Umgebung neben der bestehenden Hosting-Instanz; ob es sie gibt, ist aus dem Repository nicht ersichtlich.
