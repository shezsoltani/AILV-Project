# Lokale conftest für Unit-Tests, die Services aus app.* importieren.
#
# app.config liest beim Modulimport Pflicht-Variablen aus der Umgebung
# (JWT_SECRET_KEY, SMTP_*). Die folgenden setdefault-Aufrufe erfolgen
# auf Modulebene, bevor pytest irgendwelche Tests sammelt, damit der
# Import nicht mit RuntimeError fehlschlägt.
#
# setdefault überschreibt keine bereits gesetzten Werte (z. B. aus der
# Docker-Testumgebung oder einem echten .env).
#
# Tests in tests/unit/validators/ benötigen diese Variablen nicht,
# da sie keine App-Services importieren. Sie werden durch diese
# Konfiguration nicht beeinträchtigt.

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-not-for-production")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("OPENAI_API_KEY", "")
os.environ.setdefault("SMTP_HOST", "smtp.example.invalid")
os.environ.setdefault("SMTP_PORT", "587")
os.environ.setdefault("SMTP_USER", "test")
os.environ.setdefault("SMTP_PASSWORD", "test")
os.environ.setdefault("MAIL_FROM", "tests@example.com")
