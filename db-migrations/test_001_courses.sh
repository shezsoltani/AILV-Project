#!/usr/bin/env bash
# Test der Migration 001 (LV-Modell) auf einer WEGWERF-Datenbank.
# Legt eigene Test-Datenbanken an (mig_test_old, mig_test_new) und loescht sie am Ende wieder.
# Verbindung ueber die ueblichen Variablen: PGHOST, PGPORT, PGUSER, PGPASSWORD.
# NIEMALS gegen eine gemeinsame oder produktive Datenbank ausfuehren.
#
# Beispiel (lokal, Docker-DB mit Port 5432):
#   PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres bash db-migrations/test_001_courses.sh
set -euo pipefail
cd "$(dirname "$0")/.."

OLD=mig_test_old
NEW=mig_test_new
export PGOPTIONS="-c client_min_messages=warning"
P="psql -v ON_ERROR_STOP=1 -X -q -t -A"
fail() { echo "FEHLER: $*" >&2; exit 1; }
ok()   { echo "  OK  $*"; }
expect_error() { # SQL muss scheitern
  if $P -d "$OLD" -c "$1" >/dev/null 2>&1; then fail "haette scheitern muessen: $1"; fi
}

cleanup() { psql -X -q -d postgres -c "DROP DATABASE IF EXISTS $OLD" -c "DROP DATABASE IF EXISTS $NEW" -c "DROP DATABASE IF EXISTS mig_cmp" >/dev/null 2>&1 || true; rm -f /tmp/mig_legacy.sql /tmp/mig_backup.sql; }
trap cleanup EXIT
cleanup

# --- Altes Schema = db-init/01_tables.sql ohne den LV-Block ------------------
tr -d '\r' < db-init/01_tables.sql | awk '
  /^-- COURSES \(/ {skip=1}
  skip && /idx_question_courses_course_id/ {skip=0; next}
  !skip {print}' > /tmp/mig_legacy.sql
grep -q "courses" /tmp/mig_legacy.sql && fail "Altes Schema enthaelt noch LV-Tabellen"

echo "== 1. Alte Datenbank mit Testdaten anlegen =="
psql -X -q -d postgres -c "CREATE DATABASE $OLD" -c "CREATE DATABASE $NEW"
$P -d "$OLD" -f /tmp/mig_legacy.sql >/dev/null
$P -d "$OLD" <<'SQL'
INSERT INTO users (username,email,password_hash)
SELECT 'user'||g, 'user'||g||'@test.at', 'x' FROM generate_series(1,3) g;
INSERT INTO generation_requests (user_id,topic,language,count,types)
SELECT u.id, 'Thema '||r, 'de', 5, '[]' FROM users u, generate_series(1,2) r;
INSERT INTO prompts (request_id,stage,prompt_text)
SELECT id,'CONTENT','p' FROM generation_requests;
INSERT INTO questions (request_id,prompt_id,type,difficulty,stem,choices,correct_index)
SELECT gr.id, p.id, 'MULTIPLE_CHOICE','easy','Frage '||q||' zu '||gr.topic,'["a","b"]'::jsonb,0
FROM generation_requests gr JOIN prompts p ON p.request_id=gr.id, generate_series(1,5) q;
INSERT INTO slide_decks (user_id,name) SELECT id,'Deck' FROM users;
SQL

snapshot() { # Anzahl + Hash ueber alle Zeilen der Bestandstabellen
  $P -d "$1" <<'SQL'
SELECT 'users', count(*), md5(string_agg(t::text, ',' ORDER BY id)) FROM users t
UNION ALL SELECT 'generation_requests', count(*), md5(string_agg(t::text, ',' ORDER BY id)) FROM generation_requests t
UNION ALL SELECT 'prompts', count(*), md5(string_agg(t::text, ',' ORDER BY id)) FROM prompts t
UNION ALL SELECT 'questions', count(*), md5(string_agg(t::text, ',' ORDER BY id)) FROM questions t
UNION ALL SELECT 'slide_decks', count(*), md5(string_agg(t::text, ',' ORDER BY id)) FROM slide_decks t
ORDER BY 1;
SQL
}
BEFORE=$(snapshot "$OLD")
echo "$BEFORE" | sed 's/^/   vorher: /'

echo "== 2. Migration (UP) ausfuehren =="
$P -d "$OLD" -f db-migrations/001_add_courses.up.sql >/dev/null
AFTER=$(snapshot "$OLD")
echo "$AFTER" | sed 's/^/   nachher: /'
[ "$BEFORE" = "$AFTER" ] || fail "Bestandsdaten (IDs/Anzahl/Inhalt) haben sich geaendert"
ok "Anzahl und Inhalt aller bisherigen Datensaetze (inkl. IDs und request_id) identisch"
[ "$($P -d $OLD -c 'SELECT count(*) FROM courses')" = 0 ] || fail "courses nicht leer"
[ "$($P -d $OLD -c 'SELECT count(*) FROM question_courses')" = 0 ] || fail "question_courses nicht leer"
ok "Neue Tabellen sind leer: bestehende Fragen haben keine LV"
$P -d "$OLD" -c "SELECT q.id, q.request_id FROM questions q LEFT JOIN question_courses qc ON qc.question_id=q.id WHERE qc.question_id IS NULL LIMIT 1" | grep -q . || fail "Frage ohne LV nicht abfragbar"
ok "Alte Frage ist weiterhin abfragbar (LEFT JOIN, ohne LV)"

echo "== 3. Migration ein zweites Mal (Idempotenz) =="
$P -d "$OLD" -f db-migrations/001_add_courses.up.sql >/dev/null
ok "zweiter Lauf ohne Fehler"

echo "== 4. Verhalten des Modells =="
$P -d "$OLD" <<'SQL'
INSERT INTO courses (user_id,name) SELECT id,'Mathematik' FROM users WHERE username='user1';
INSERT INTO courses (user_id,name) SELECT id,'Statistik'  FROM users WHERE username='user1';
INSERT INTO courses (user_id,name) SELECT id,'Mathematik' FROM users WHERE username='user2';
INSERT INTO question_courses (question_id,course_id)
SELECT q.id, c.id FROM (SELECT id FROM questions ORDER BY id LIMIT 1) q, courses c WHERE c.user_id=(SELECT id FROM users WHERE username='user1');
SQL
ok "eine Frage in zwei LVs (Mathematik + Statistik) ohne Kopie"
[ "$($P -d $OLD -c 'SELECT count(*) FROM questions')" = 30 ] || fail "Fragenanzahl veraendert"
Q=$($P -d $OLD -c "SELECT question_id FROM question_courses LIMIT 1")
C=$($P -d $OLD -c "SELECT course_id FROM question_courses LIMIT 1")
expect_error "INSERT INTO question_courses (question_id,course_id) VALUES ('$Q','$C')"
ok "doppelte Zuordnung wird abgelehnt"
U1=$($P -d $OLD -c "SELECT id FROM users WHERE username='user1'")
expect_error "INSERT INTO courses (user_id,name) VALUES ('$U1','mathematik')"
ok "gleicher LV-Name (auch anders geschrieben) beim selben Benutzer wird abgelehnt"
expect_error "INSERT INTO courses (user_id,name) VALUES ('$U1','   ')"
ok "leerer LV-Name wird abgelehnt"
[ "$($P -d $OLD -c "SELECT count(*) FROM courses WHERE lower(name)='mathematik'")" = 2 ] || fail "Gleicher Name bei verschiedenen Benutzern muss erlaubt sein"
ok "gleicher LV-Name bei verschiedenen Benutzern ist erlaubt"
expect_error "INSERT INTO question_courses (question_id,course_id) VALUES (uuid_generate_v4(),'$C')"
ok "unbekannte question_id wird abgelehnt (Fremdschluessel)"

# LV loeschen -> nur Zuordnungen weg, Fragen bleiben
$P -d "$OLD" -c "DELETE FROM courses WHERE id='$C'"
[ "$($P -d $OLD -c 'SELECT count(*) FROM questions')" = 30 ] || fail "LV loeschen hat Fragen geloescht"
[ "$($P -d $OLD -c "SELECT count(*) FROM question_courses WHERE course_id='$C'")" = 0 ] || fail "Zuordnung blieb"
ok "LV geloescht: Zuordnung entfernt, alle 30 Fragen bleiben erhalten"
[ "$($P -d $OLD -c "SELECT count(*) FROM question_courses WHERE question_id='$Q'")" = 1 ] || fail "andere Zuordnung der Frage verloren"
ok "andere Zuordnung derselben Frage bleibt bestehen"

# Frage loeschen -> LV bleibt
$P -d "$OLD" -c "DELETE FROM questions WHERE id='$Q'"
[ "$($P -d $OLD -c "SELECT count(*) FROM courses WHERE user_id='$U1'")" = 1 ] || fail "LV nach Frage-Loeschen verschwunden"
[ "$($P -d $OLD -c "SELECT count(*) FROM question_courses")" = 0 ] || fail "verwaiste Zuordnung"
ok "Frage geloescht: Zuordnungen weg, LV bleibt bestehen"

# Request loeschen (Archiv-Loeschen) -> Fragen+Zuordnungen weg, LV bleibt
Q2=$($P -d $OLD -c "SELECT id FROM questions WHERE request_id IN (SELECT id FROM generation_requests WHERE user_id='$U1') LIMIT 1")
C2=$($P -d $OLD -c "SELECT id FROM courses WHERE user_id='$U1' LIMIT 1")
R2=$($P -d $OLD -c "SELECT request_id FROM questions WHERE id='$Q2'")
$P -d "$OLD" -c "INSERT INTO question_courses (question_id,course_id) VALUES ('$Q2','$C2')"
$P -d "$OLD" -c "DELETE FROM generation_requests WHERE id='$R2'"
[ "$($P -d $OLD -c "SELECT count(*) FROM question_courses")" = 0 ] || fail "Zuordnung nach Request-Loeschen uebrig"
[ "$($P -d $OLD -c "SELECT count(*) FROM courses WHERE id='$C2'")" = 1 ] || fail "LV nach Request-Loeschen weg"
ok "Archiv-Eintrag geloescht (wie bisher): Fragen und Zuordnungen weg, LV bleibt"

echo "== 5. Neue Installation (01_tables.sql) im Vergleich zur Migration =="
tr -d '\r' < db-init/01_tables.sql | $P -d "$NEW" -f - >/dev/null
dump() { pg_dump -s -t courses -t question_courses --no-owner "$1" | grep -v '^--' | grep -v '^$' | grep -v '^SET\|^SELECT pg_catalog\|^.restrict\|^.unrestrict'; }
# Vergleich der Struktur: frisch installiert vs. migriert
psql -X -q -d postgres -c "CREATE DATABASE mig_cmp" >/dev/null
$P -d mig_cmp -f /tmp/mig_legacy.sql >/dev/null && $P -d mig_cmp -f db-migrations/001_add_courses.up.sql >/dev/null
if [ "$(dump $NEW | sort)" = "$(dump mig_cmp | sort)" ]; then ok "Struktur von Neuinstallation und migrierter DB ist identisch"; else
  diff <(dump $NEW | sort) <(dump mig_cmp | sort); fail "Struktur unterscheidet sich"; fi
psql -X -q -d postgres -c "DROP DATABASE mig_cmp" >/dev/null

echo "== 6. Ruecknahme (DOWN) mit Sicherung =="
$P -d "$OLD" -c "INSERT INTO question_courses (question_id,course_id) SELECT q.id, c.id FROM (SELECT id FROM questions ORDER BY id LIMIT 3) q, courses c WHERE c.user_id='$U1'"
N_ASSIGN=$($P -d $OLD -c 'SELECT count(*) FROM question_courses'); N_COURSE=$($P -d $OLD -c 'SELECT count(*) FROM courses')
SNAP_Q=$(snapshot "$OLD")
pg_dump -d "$OLD" -t courses -t question_courses --data-only --column-inserts > /tmp/mig_backup.sql
grep -q "INSERT INTO public.question_courses" /tmp/mig_backup.sql || fail "Sicherung enthaelt keine Zuordnungen"
ok "Sicherung erstellt ($N_COURSE LVs, $N_ASSIGN Zuordnungen)"
$P -d "$OLD" -f db-migrations/001_add_courses.down.sql >/dev/null
[ "$($P -d $OLD -c "SELECT count(*) FROM information_schema.tables WHERE table_name IN ('courses','question_courses')")" = 0 ] || fail "LV-Tabellen noch da"
[ "$(snapshot $OLD)" = "$SNAP_Q" ] || fail "Bestandsdaten nach DOWN veraendert"
ok "DOWN: LV-Tabellen entfernt, alle Bestandsdaten (Fragen, Requests, User) unveraendert"
$P -d "$OLD" -f db-migrations/001_add_courses.up.sql >/dev/null
$P -d "$OLD" -f /tmp/mig_backup.sql >/dev/null
[ "$($P -d $OLD -c 'SELECT count(*) FROM question_courses')" = "$N_ASSIGN" ] && [ "$($P -d $OLD -c 'SELECT count(*) FROM courses')" = "$N_COURSE" ] || fail "Wiederherstellung unvollstaendig"
ok "UP + Sicherung einspielen stellt LVs und Zuordnungen wieder her"

echo
echo "ALLE TESTS BESTANDEN"
