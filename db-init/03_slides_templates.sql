
-- SLIDES_OUTLINE (de)
INSERT INTO prompt_templates (stage, language, template)
VALUES (
           'SLIDES_OUTLINE',
           'de',
           $$
               Du bist ein erfahrener didaktischer Redakteur für Lehrpräsentationen.
Erstelle eine Gliederung für eine Folienpräsentation zum Thema "{{topic}}".

Die Präsentation hat insgesamt {{slide_count}} Folien:
- Folie 1: Titelfolie (slide_type: "title")
- Folien 2 bis {{ slide_count - 1 }}: Inhaltsfolien (slide_type: "content"), Anzahl: {{ slide_count - 2 }}
- Folie {{slide_count}}: Abschlussfolie (slide_type: "closing")

Sprache: {{language}}

Gib für jede Folie nur folgende Informationen an:
- position (1-basiert, fortlaufend ohne Lücken)
- slide_type ("title", "content" oder "closing")
- title (kurzer, prägnanter Folientitel, max. 8 Wörter, keine abschließende Satzzeichen)

Regeln:
- Keine Platzhalter wie "Lorem Ipsum", "TODO", "…", "tbd" oder leere Titel.
- Keine Doppelungen zwischen Folientiteln.
- Keine Meta-Kommentare über die Präsentation selbst.

Ausgabe-Hinweis:
- Antworte ausschließlich mit einem gültigen JSON-Array.
- Keine Prosa vor oder nach dem JSON, keine Markdown-Codefences, keine Kommentare.

Antwortformat: JSON-Array mit Objekten der Form:
{ "position": 1, "slide_type": "title", "title": "Folientitel" }

{% if previous_error is defined and previous_error %}
FEEDBACK ZUM LETZTEN VERSUCH:

{{ previous_error }}

Dies ist Versuch Nummer {{ attempt }}.
Bitte korrigiere den Fehler und halte dich strikt an das JSON-Format.
{% endif %}
$$
);

-- SLIDES_CONTENT (de)
INSERT INTO prompt_templates (stage, language, template)
VALUES (
           'SLIDES_CONTENT',
           'de',
           $$
               Du bist ein erfahrener didaktischer Redakteur für Lehrpräsentationen zum Thema "{{topic}}".
Du erhältst die folgende Gliederung:
{{outline_data}}

Erzeuge daraus die vollständigen Folieninhalte.

{% if context_text %}
Zusätzlicher Kontext vom Nutzer (verbindlich beachten):
{{ context_text }}

{% endif %}
{% if upload_context %}
Inhalt aus hochgeladenem Dokument (als primäre Quelle bevorzugen):
{{ upload_context }}

{% endif %}

Strukturregeln:
- Sprache aller Texte (Titel, Bullets und Examples): {{language}}
- Übernimm position, slide_type und title exakt aus der Gliederung – ändere weder Reihenfolge noch Anzahl noch Typ der Folien.
- slide_type "title": 1 bis 2 Bullets als kurzer Untertitel/Einleitung. Setze "examples": [].
- slide_type "content": 3 bis 7 Bullets je Folie.
- slide_type "closing": 2 bis 4 Bullets mit Zusammenfassung, Ausblick oder Call-to-Action. Setze "examples": [].

Bullet-Stil – SEHR WICHTIG:
- Jeder Bullet ist ein vollständiger Aussagesatz mit konkretem Informationsgehalt: Definition, Mechanismus, Wirkung, Beleg oder konkreter Effekt.
- KEINE bloßen Schlagwörter, Themenüberschriften oder Substantivketten.
- Mindestens 10 Wörter pro Bullet, maximal 30 Wörter.
- Jeder Bullet muss ein Verb und eine Aussage enthalten – nicht nur ein Thema benennen.
- Parallel formuliert, aber nicht telegrafisch verkürzt.
- Keine abschließenden Satzzeichen am Bullet-Ende (außer bei Fragen oder Ausrufen, wenn inhaltlich nötig).
- Keine Nummerierung und keine Aufzählungszeichen innerhalb der Bullets – nur der reine Text als Listenelement.

Beispiele (ausschließlich Stilreferenz, NICHT inhaltlich übernehmen):
- Die folgenden Beispiele zeigen nur die gewünschte Satzform.
- Übernimm keine Inhalte, Begriffe, Beispiele oder Themen aus diesen Stilreferenzen.
- Wende nur die Struktur "konkrete Aussage statt Schlagwort" auf das Nutzerthema "{{topic}}" an.

SCHLECHT – nur Schlagwort, vermeiden:
- "Ursachen der Urbanisierung"
- "Auswirkungen auf den Verkehr"
- "Rolle erneuerbarer Energien"
- "Wichtige Aspekte der Teamarbeit"

GUT – konkrete Aussage, anstreben:
- "Urbanisierung entsteht häufig durch bessere Arbeitsangebote in Städten und verändert Wohnraum, Verkehr und Infrastruktur"
- "Dichter Verkehr erhöht Lärm und Emissionen, wenn Straßenplanung und öffentlicher Nahverkehr nicht mitwachsen"
- "Erneuerbare Energien senken langfristig CO2-Emissionen, benötigen aber Speicher und flexible Netze"
- "Klare Rollen im Team reduzieren Missverständnisse und machen Verantwortlichkeiten während gemeinsamer Arbeit sichtbar"

Inhaltsregeln:
- Mindestens 30 % aller Inhaltsfolien (slide_type "content", aufgerundet) müssen im Feld "examples" mindestens einen Eintrag enthalten. Ein Beispiel nennt einen konkreten Fall, ein Werkzeug, eine Studie oder ein Szenario.
- Folien ohne Beispiel erhalten "examples": [].
- Fachbegriffe konsistent verwenden und beim ersten Auftauchen kurz inhaltlich verankern.
- Keine Wiederholungen zwischen den Folien, keine widersprüchlichen Aussagen.
- Keine erfundenen Zahlen, Quellen- oder Zitatangaben. Wenn eine konkrete Zahl nicht gesichert ist, qualitativ formulieren ("häufig", "in mehreren Studien beobachtet").
- Keine Platzhalter wie "Lorem Ipsum", "TODO", "…", "tbd" oder leere Bullets.
- Keine Meta-Kommentare über die Präsentation, den Auftrag oder den Erzeugungsprozess.

Ausgabe-Hinweis:
- Antworte ausschließlich mit einem gültigen JSON-Array.
- Keine Prosa vor oder nach dem JSON, keine Markdown-Codefences, keine Kommentare.
- Jedes Objekt muss das Feld "examples" enthalten (leeres Array wenn kein Beispiel).

Antwortformat: JSON-Array mit Objekten der Form:
{ "position": 1, "slide_type": "content", "title": "Folientitel", "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"], "examples": ["Konkretes Beispiel"] }

{% if previous_error is defined and previous_error %}
FEEDBACK ZUM LETZTEN VERSUCH:

{{ previous_error }}

Dies ist Versuch Nummer {{ attempt }}.
Bitte korrigiere den Fehler und halte dich strikt an das JSON-Format.
{% endif %}
$$
);

-- SLIDES_IMPROVE (de)
INSERT INTO prompt_templates (stage, language, template)
VALUES (
           'SLIDES_IMPROVE',
           'de',
           $$
               Du bist ein erfahrener didaktischer Redakteur und optimierst eine bestehende Folienpräsentation rein sprachlich und didaktisch.
Eingabefolien:

{{slides_raw}}

Strikte Invarianten (nicht verändern):
- Anzahl der Folien bleibt exakt gleich – keine Folie hinzufügen, entfernen oder umsortieren.
- position und slide_type jeder Folie unverändert übernehmen.
- Keine neuen Fakten, Zahlen, Namen oder Beispiele ergänzen. Keine vorhandenen Beispiele durch andere ersetzen.
- Keine zusätzlichen Bullets hinzufügen und keine vorhandenen Bullets löschen.
- Hat eine Folie Einträge in "examples", müssen diese erhalten bleiben (Formulierung darf sprachlich geschärft werden).

Optimierungsregeln:
- Sprache aller Folien vereinheitlichen: alle Titel, Bullets und Examples werden in {{language}} formuliert. Bereits passende Texte nur bei Bedarf minimal schärfen.
- Titel prägnant und aussagekräftig, max. 8 Wörter, keine abschließenden Satzzeichen.
- Bullets bleiben vollständige Aussagesätze mit konkretem Informationsgehalt: mindestens 10 Wörter, maximal 30 Wörter pro Bullet.
- Bullets NICHT zu Schlagwörtern, Themenüberschriften oder Substantivketten verkürzen. Jeder Bullet enthält weiterhin ein Verb und eine Aussage.
- Sprachlich glätten und parallelisieren, aber den Aussagecharakter bewahren – keine telegrafische Verkürzung.
- Fachterminologie korrekt und über alle Folien hinweg konsistent.
- Examples sprachlich schärfen, aber inhaltlich und strukturell erhalten.
- Keine Platzhalter wie "Lorem Ipsum", "TODO", "…" oder leere Bullets.
- Keine Meta-Kommentare über den Verbesserungsprozess oder das Modell.

Beispiele (ausschließlich Stilreferenz – zeigen die Verbesserungsrichtung, NICHT inhaltlich übernehmen):

VORHER – zu kurz oder als Schlagwort, verbessern:
- "Vorteile der Digitalisierung"
- "Energieeffizienz wichtig für Kosten"

NACHHER – vollständige Aussage, anstreben:
- "Digitalisierung beschleunigt Prozesse, reduziert Papieraufwand und ermöglicht ortsunabhängige Zusammenarbeit in Unternehmen"
- "Energieeffiziente Gebäude senken Betriebskosten spürbar und verringern gleichzeitig den CO2-Ausstoß im laufenden Betrieb"

Ausgabe-Hinweis:
- Antworte ausschließlich mit einem gültigen JSON-Array.
- Keine Prosa vor oder nach dem JSON, keine Markdown-Codefences, keine Kommentare.
- Jedes Objekt muss das Feld "examples" enthalten (leeres Array wenn kein Beispiel vorhanden war).

Antwortformat: gleiche Struktur wie die Eingabe – JSON-Array mit Objekten { "position", "slide_type", "title", "bullets", "examples" }.

{% if previous_error is defined and previous_error %}
FEEDBACK ZUM LETZTEN VERSUCH:

{{ previous_error }}

Dies ist Versuch Nummer {{ attempt }}.
Bitte korrigiere den Fehler und halte dich strikt an das JSON-Format.
{% endif %}
$$
);


-- ENGLISH TEMPLATES -----------------------    -------------------------

-- SLIDES_OUTLINE (en)
INSERT INTO prompt_templates (stage, language, template)
VALUES (
           'SLIDES_OUTLINE',
           'en',
           $$
               You are an experienced instructional editor for teaching presentations.
Create an outline for a slide presentation on the topic "{{topic}}".

The presentation has {{slide_count}} slides in total:
- Slide 1: Title slide (slide_type: "title")
- Slides 2 to {{ slide_count - 1 }}: Content slides (slide_type: "content"), count: {{ slide_count - 2 }}
- Slide {{slide_count}}: Closing slide (slide_type: "closing")

Language: {{language}}

For each slide, provide only the following information:
- position (1-based, consecutive, no gaps)
- slide_type ("title", "content" or "closing")
- title (short, concise slide title, max 8 words, no trailing punctuation)

Rules:
- No placeholders such as "Lorem Ipsum", "TODO", "…", "tbd" or empty titles.
- No duplicate titles between slides.
- No meta-comments about the presentation itself.

Output guard:
- Respond with a valid JSON array only.
- No prose before or after the JSON, no markdown code fences, no comments.

Response format: JSON array with objects of the form:
{ "position": 1, "slide_type": "title", "title": "Slide title" }

{% if previous_error is defined and previous_error %}
FEEDBACK:

{{ previous_error }}

Attempt {{ attempt }} – please fix the issue and follow the JSON format strictly.
{% endif %}
$$
);


-- SLIDES_CONTENT (en)
INSERT INTO prompt_templates (stage, language, template)
VALUES (
           'SLIDES_CONTENT',
           'en',
           $$
               You are an experienced instructional editor for teaching presentations on the topic "{{topic}}".
You receive the following outline:
{{outline_data}}

Generate the complete slide contents from it.

{% if context_text %}
Additional context from user (must be respected):
{{ context_text }}

{% endif %}
{% if upload_context %}
Content from uploaded document (prefer as primary source):
{{ upload_context }}

{% endif %}

Structural rules:
- Language of all texts (titles and bullets): {{language}}
- Keep position, slide_type and title exactly as given in the outline – do not change the order, number or type of slides.
- slide_type "title": 1 to 2 bullets as a short subtitle/intro. Set "examples": [].
- slide_type "content": 3 to 7 bullets per slide.
- slide_type "closing": 2 to 4 bullets with summary, outlook or call-to-action. Set "examples": [].

Bullet style – VERY IMPORTANT:
- Each bullet is a complete declarative statement with concrete informational content: definition, mechanism, effect, evidence or concrete consequence.
- NO bare keywords, topic headings or noun chains.
- At least 10 words per bullet, at most 30 words.
- Each bullet must contain a verb and make a claim – not merely name a topic.
- Parallel phrasing, but not telegraphic shorthand.
- No trailing punctuation at the end of a bullet (except for questions or exclamations when content-wise required).
- No numbering or bullet symbols inside the text – just the raw text as a list element.

Examples (style reference only, do NOT copy content):
- The following examples only show the desired sentence form.
- Do not reuse any content, terms, examples or topics from these style references.
- Apply only the structure "concrete claim instead of keyword" to requested topic "{{topic}}".

BAD – mere keyword, avoid:
- "Causes of urbanization"
- "Effects on traffic"
- "Role of renewable energy"
- "Important aspects of teamwork"

GOOD – concrete claim, aim for this:
- "Urbanization often results from better job opportunities in cities and changes housing, transport and infrastructure"
- "Dense traffic increases noise and emissions when road planning and public transport do not grow accordingly"
- "Renewable energy reduces CO2 emissions over time but requires storage systems and flexible power grids"
- "Clear team roles reduce misunderstandings and make responsibilities visible during shared work"

Content rules:
- At least 30% of all content slides (slide_type "content", rounded up) must have at least one entry in the "examples" field. An example names a concrete case, tool, study or scenario.
- Slides without an example receive "examples": [].
- Use terminology consistently and briefly anchor it on first occurrence.
- No repetitions across slides, no contradictory statements.
- No invented numbers, sources or citations. If a concrete figure is not certain, phrase it qualitatively ("often", "observed in several studies").
- No placeholders such as "Lorem Ipsum", "TODO", "…", "tbd" or empty bullets.
- No meta-comments about the presentation, the task or the generation process.

Output guard:
- Respond with a valid JSON array only.
- No prose before or after the JSON, no markdown code fences, no comments.
- Every object must include the "examples" field (empty array when no example is needed).

Response format: JSON array with objects of the form:
{ "position": 1, "slide_type": "content", "title": "Slide title", "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"], "examples": ["Concrete example"] }

{% if previous_error is defined and previous_error %}
FEEDBACK:

{{ previous_error }}

Attempt {{ attempt }} – please fix the issue and follow the JSON format strictly.
{% endif %}
$$
);

-- SLIDES_IMPROVE (en)
INSERT INTO prompt_templates (stage, language, template)
VALUES (
           'SLIDES_IMPROVE',
           'en',
           $$
               You are an experienced instructional editor refining an existing slide presentation purely linguistically and didactically.
Input slides:

{{slides_raw}}

Strict invariants (do not change):
- Number of slides stays exactly the same – do not add, remove or reorder any slide.
- Preserve position and slide_type of every slide unchanged.
- Do not add new facts, numbers, names or examples. Do not replace existing examples with different ones.
- Do not add extra bullets and do not delete existing bullets.
- If a slide has entries in "examples", keep them (you may refine their wording only).

Optimization rules:
- Unify the language of all slides: every title, bullet and example must be phrased in {{language}}. Only tighten already fitting texts minimally.
- Titles concise and meaningful, max 8 words, no trailing punctuation.
- Bullets remain complete declarative statements with concrete informational content: at least 10 words, at most 30 words per bullet.
- Do NOT shorten bullets into bare keywords, topic headings or noun chains. Each bullet still contains a verb and makes a claim.
- Smooth and parallelize phrasing while preserving the assertive character – no telegraphic shorthand.
- Terminology correct and consistent across all slides.
- Keep entries in "examples" – refine their wording, preserve their content and count.
- No placeholders such as "Lorem Ipsum", "TODO", "…" or empty bullets.
- No meta-comments about the improvement process or the model.

Examples (style reference only – showing the direction of improvement, do NOT copy content):

BEFORE – too short or keyword-only, to be improved:
- "Benefits of digitalization"
- "Energy efficiency important for costs"

AFTER – complete declarative statement, aim for this:
- "Digitalization speeds up workflows, reduces paper handling and enables remote collaboration across organizational teams"
- "Energy-efficient buildings noticeably lower operating costs while reducing CO2 emissions during daily operations"

Output guard:
- Respond with a valid JSON array only.
- No prose before or after the JSON, no markdown code fences, no comments.
- Every object must include the "examples" field (empty array when no example was present).

Response format: same structure as the input – JSON array with objects { "position", "slide_type", "title", "bullets", "examples" }.

{% if previous_error is defined and previous_error %}
FEEDBACK:

{{ previous_error }}

Attempt {{ attempt }} – please fix the issue and follow the JSON format strictly.
{% endif %}
$$
);
