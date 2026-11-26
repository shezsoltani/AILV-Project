# Schreibt Testergebnisse und Coverage in die Zusammenfassung des Workflow-Laufs.
# Aufruf: python3 test_summary.py <Titel> <junit.xml> <coverage.xml (Cobertura)>
import os
import sys
import xml.etree.ElementTree as ET

title, junit_path, coverage_path = sys.argv[1:4]
lines = [f"### {title}", ""]

try:
    root = ET.parse(junit_path).getroot()
    suites = [root] if root.tag == "testsuite" else root.findall("testsuite")
    total = sum(int(s.get("tests", 0)) for s in suites)
    failed = sum(int(s.get("failures", 0)) + int(s.get("errors", 0)) for s in suites)
    skipped = sum(int(s.get("skipped", 0)) for s in suites)
    lines += [
        "| Tests | Bestanden | Fehlgeschlagen | Übersprungen |",
        "|---|---|---|---|",
        f"| {total} | {total - failed - skipped} | {failed} | {skipped} |",
        "",
    ]

    failures = [
        f"{case.get('classname', '')} › {case.get('name', '')}"
        for case in root.iter("testcase")
        if case.find("failure") is not None or case.find("error") is not None
    ]
    if failures:
        lines.append("**Fehlgeschlagene Tests:**")
        lines += [f"- `{name}`" for name in failures[:30]]
        if len(failures) > 30:
            lines.append(f"- … und {len(failures) - 30} weitere")
        lines.append("")
except (OSError, ET.ParseError):
    lines += ["Keine Testergebnisse gefunden.", ""]

try:
    line_rate = float(ET.parse(coverage_path).getroot().get("line-rate"))
    lines += [f"**Coverage (Zeilen):** {line_rate * 100:.1f} %", ""]
except (OSError, ET.ParseError, TypeError, ValueError):
    lines += ["Keine Coverage-Daten gefunden.", ""]

with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
    summary.write("\n".join(lines) + "\n")
