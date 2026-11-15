# PostgreSQL-Integrationstests für Hintergrundjobs

Alle Befehle werden im Verzeichnis `backend/` ausgeführt. Docker Desktop muss
mit Linux-Containern laufen.

## Gesamtlauf

```shell
docker compose -f compose.test.yml run --build --rm tests
```

## Nur Integrationstests

```shell
docker compose -f compose.test.yml run --rm tests tests/integration -v
```

Nach Änderungen an Abhängigkeiten auch hier `--build` ergänzen. Nur die
Infrastrukturtests ausführen:

```shell
docker compose -f compose.test.yml run --rm tests tests/integration/test_database.py -v
```

Compose setzt `TEST_DATABASE_URL` fest auf den internen PostgreSQL-Testdienst
`db-test` und die Datenbank `aildb_test`. Produktive Zugangsdaten oder eine
lokale `.env.test` sind nicht erforderlich. Das interne Netzwerk und das eigene
Testvolume bleiben unverändert.

## Eigene Job-Session im Testschema

`db_session_factory` erzeugt bei jedem Aufruf eine neue echte SQLAlchemy-Session,
gebunden an dieselbe freigegebene Testverbindung wie `db_session`. Sie öffnet
keine neue Datenbankverbindung. Die Sperre für reguläre Engines bleibt aktiv.

Die Factory wird ausdrücklich über den vorhandenen Parameter `session_factory`
an `run_questions_job` oder `run_slides_job` übergeben. Ein Override von `get_db`
ändert die Session-Factory des Jobs nicht. Das gilt auch für Jobs, die über
HTTP-Endpunkte gestartet werden: Diese müssen gesondert an die Factory angebunden
werden; der normale `client` allein übernimmt das nicht.

Request- und Job-Session dürfen die Verbindung nur nacheinander verwenden:

1. Benötigte Benutzer, Requests und Job auf der Request-Seite anlegen.
2. Änderungen committen und benötigte IDs in lokalen Variablen speichern.
3. `db_session.close()` aufrufen. Repository-Methoden führen nach `commit()` oft
   ein `refresh()` aus und starten dadurch bereits eine weitere Transaktion.
4. Den Job mit `session_factory=db_session_factory` ausführen. Der Job schließt
   seine eigene Session in seinem vorhandenen `finally`-Block.
5. Anschließend die Request-Session erneut verwenden. `close()` setzt sie nach
   SQLAlchemy-Standardverhalten zurück; die neue Abfrage liest wieder aus PostgreSQL.

Nicht committete Änderungen werden bei `close()` verworfen. Eine neue Session
wird von der Factory abgelehnt, solange eine bereits erzeugte Session noch eine
aktive Transaktion hat. Auch später keine älteren Sessions parallel weiterverwenden.

Alle Sessions erhalten `join_transaction_mode="create_savepoint"`. Darunter
liegt ein zusätzlicher gemeinsamer Savepoint pro Test. Job-`commit()` und
Job-`close()` beenden deshalb nicht die äußere Test-Isolation. Beim Fixture-Abbau
werden alle erzeugten Sessions geschlossen und der gemeinsame Savepoint wird
zurückgerollt. Am Ende des gesamten Laufs wird auch das private Testschema
zurückgerollt.

## Geprüfter Infrastrukturablauf

`tests/integration/test_database.py` führt den echten Fragen-Jobrunner mit der
Test-Factory aus. Nur der Batch-Runner wird durch eine lokale Async-Funktion
ersetzt, damit keine externe LLM-Anfrage nötig ist. Job-Repository, Session,
Commits und PostgreSQL bleiben echt.

Der Test prüft die Sichtbarkeit des angelegten Jobs, Status und Eigentümer in
der Job-Session, den Fortschritts-Callback, das Schließen der Job-Session und
das anschließende Lesen von `completed`, Fortschritt und Ergebnis auf der
Request-Seite. Eine Spaltenabfrage umgeht dabei die ORM-Identity-Map.

Der Ablauf läuft zweimal mit jeweils zunächst leerer Jobtabelle. Ein weiterer
Test durchläuft zusätzlich zwei vollständige Isolationsbereiche innerhalb eines
Tests und bestätigt, dass die Job-Commits nach dem Abbau verschwunden sind.
Damit lässt sich die Bereinigung auch mit diesem einzelnen Test prüfen.
