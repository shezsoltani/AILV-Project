# Lokale conftest für die Validator-Unit-Tests.
#
# Diese Tests benötigen WEDER eine Datenbank NOCH externe Dienste.
# Die Root-conftest.py importiert psycopg2 und SQLAlchemy – das führt zu einem
# ImportError, wenn psycopg2 nicht installiert ist.
#
# Ausführen ohne Root-conftest:
#   pytest tests/unit/validators/ --noconftest -v
#
# Alternativ mit der vollständigen Test-Suite (TEST_DATABASE_URL muss gesetzt sein):
#   pytest tests/ -v
