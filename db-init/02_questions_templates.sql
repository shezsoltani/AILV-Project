-- SKELETON
INSERT INTO prompt_templates (stage, language, template)
VALUES (
           'SKELETON',
           'de',
           $$
               Erstelle ein Gerüst für {{count}} Prüfungsfragen zum Thema "{{topic}}".

Gib für jede Frage nur folgende Informationen an:
- type (einer der folgenden: {{types}})
  - SCQ = Single Choice Question (genau 1 richtige Antwort)
  - MCQ = Multiple Choice Question / Multiple Response (mehrere richtige Antworten)
  - SHORT_ANSWER = Kurzantwort (Freitext)
  - TRUE_FALSE = Wahr/Falsch
- difficulty (easy, medium oder hard), entsprechend der Verteilung:
  easy: {{difficulty_distribution.easy}}%
  medium: {{difficulty_distribution.medium}}%
  hard: {{difficulty_distribution.hard}}%

Keine vollständigen Fragen erzeugen, nur ein Strukturgerüst!
Antwortformat: JSON-Array mit Objekten der Form:
{ "type": "SCQ", "difficulty": "easy"}

Sprache: {{language}}.

{% if previous_error is defined and previous_error %}
FEEDBACK ZUM LETZTEN VERSUCH:

{{ previous_error }}

Dies ist Versuch Nummer {{ attempt }}.
Bitte korrigiere den Fehler und halte dich strikt an das JSON-Format.
{% endif %}
$$
);

-- CONTENT
INSERT INTO prompt_templates (stage, language, template)
VALUES (
           'CONTENT',
           'de',
           $$
               Du erhältst das folgende Rohgerüst für Prüfungsfragen:
{{skeleton_data}}

Erzeuge daraus vollständige Prüfungsfragen zum Thema "{{topic}}".

{% if context_text %}
Zusätzlicher Kontext vom Nutzer:
{{ context_text }}

{% endif %}
{% if upload_context %}
Inhalt aus hochgeladenem Dokument:
{{ upload_context }}

{% endif %}

Regeln:
- Schreibe jede Frage in der Sprache: {{language}}
- type bestimmt das Format:
  - SCQ (Single Choice Question): 1 Frage + 4-5 Antwortoptionen, GENAU 1 richtig.
    Verwende "correct_index" (Integer) für den Index der einzig richtigen Antwort.
    Die rationale enthält eine Begründung, warum die richtige Antwort korrekt ist.
  - MCQ (Multiple Choice Question / Multiple Response): 1 Frage + 4-6 Antwortoptionen, MEHRERE richtig (mindestens 2).
    Verwende "correct_indices" (Array von Integers) für alle korrekten Antworten.
    Die rationale erklärt, welche Antworten korrekt sind und warum.
  - SHORT_ANSWER (Kurzantwort): 1 Frage + 1 kurze, korrekte Antwort.
    Die korrekte Antwort wird im Feld "answer" gespeichert.
  - TRUE_FALSE: 1 Frage + 2 Antwortoptionen (TRUE und FALSE), genau 1 richtig.
    Verwende "correct_index" (Integer) für die richtige Antwort.
    Die rationale enthält eine Begründung.
- difficulty beachten (Komplexität & Umfang)

Antwortformat: JSON-Array mit Objekten:
- SCQ:         { "stem": "Fragetext...", "type": "SCQ", "choices": ["A","B","C","D"], "correct_index": 2, "rationale": "Begründung...", "difficulty": "..."}
- MCQ:         { "stem": "Fragetext...", "type": "MCQ", "choices": ["A","B","C","D","E"], "correct_indices": [0, 2], "rationale": "A und C sind korrekt, weil...", "difficulty": "..."}
- SHORT_ANSWER: { "stem": "Fragetext...", "type": "SHORT_ANSWER", "answer": "Korrekte Antwort hier", "difficulty": "..."}
- TRUE_FALSE:  { "stem": "Fragetext...", "type": "TRUE_FALSE", "choices": ["TRUE","FALSE"], "correct_index": 0, "rationale": "Begründung...", "difficulty": "..."}

{% if previous_error is defined and previous_error %}
FEEDBACK ZUM LETZTEN VERSUCH:

{{ previous_error }}

Dies ist Versuch Nummer {{ attempt }}.
Bitte korrigiere den Fehler und halte dich strikt an das JSON-Format.
{% endif %}
$$
);

-- IMPROVE
INSERT INTO prompt_templates (stage, language, template)
VALUES (
           'IMPROVE',
           'de',
           $$
               Verbessere die folgenden Prüfungsfragen sprachlich und didaktisch, ohne deren Kern zu verändern:

{{questions_raw}}

Optimierungsregeln:
- klare, eindeutige Formulierungen
- Fachterminologie korrekt und konsistent
- SCQ/MCQ-Optionen plausibel und unterscheidbar
- Rationale präzisieren, kurz und evidenzbasiert
- Bei MCQ-Fragen: correct_indices als Array beibehalten, nie auf correct_index wechseln
- Bei SCQ-Fragen: correct_index als Integer beibehalten, nie auf correct_indices wechseln
- Keine Hinweise auf internen Bewertungsprozess

Antwortformat: gleiche Struktur wie Eingabe (JSON-Array).

{% if previous_error is defined and previous_error %}
FEEDBACK ZUM LETZTEN VERSUCH:

{{ previous_error }}

Dies ist Versuch Nummer {{ attempt }}.
Bitte korrigiere den Fehler und halte dich strikt an das JSON-Format.
{% endif %}
$$
);

-- ENGLISH TEMPLATES ----------------------------------------

-- SKELETON (en)
INSERT INTO prompt_templates (stage, language, template)
VALUES (
           'SKELETON',
           'en',
           $$
               Create a skeleton for {{count}} exam questions on the topic "{{topic}}".

For each question, provide only the following information:
- type (one of the following: {{types}})
  - SCQ = Single Choice Question (exactly 1 correct answer)
  - MCQ = Multiple Choice Question / Multiple Response (multiple correct answers)
  - SHORT_ANSWER = Short answer (free text)
  - TRUE_FALSE = True/False
- difficulty (easy, medium or hard), according to the distribution:
  easy: {{difficulty_distribution.easy}}%
  medium: {{difficulty_distribution.medium}}%
  hard: {{difficulty_distribution.hard}}%

Do not generate complete questions, only a structural skeleton!
           Response format: JSON array with objects of the form:
       { "type": "SCQ", "difficulty": "easy"}

Language: {{language}}.

{% if previous_error is defined and previous_error %}
FEEDBACK:
{{ previous_error }}

Attempt {{ attempt }} – please fix the issue.
{% endif %}
$$
);

-- CONTENT (en)
INSERT INTO prompt_templates (stage, language, template)
VALUES (
           'CONTENT',
           'en',
           $$
               You receive the following raw skeleton for exam questions:
{{skeleton_data}}

Generate complete exam questions from it on the topic "{{topic}}".

{% if context_text %}
Additional context from user:
{{ context_text }}

{% endif %}
{% if upload_context %}
Input from uploaded document:
{{ upload_context }}

{% endif %}

Rules:
- Write each question in the language: {{language}}
- type determines the format:
  - SCQ (Single Choice Question): 1 question + 4-5 answer options, EXACTLY 1 correct.
    Use "correct_index" (integer) for the index of the single correct answer.
    The rationale explains why the correct answer is right.
  - MCQ (Multiple Choice Question / Multiple Response): 1 question + 4-6 options, MULTIPLE correct (at least 2).
    Use "correct_indices" (array of integers) for all correct answers.
    The rationale explains which answers are correct and why.
  - SHORT_ANSWER: 1 question + 1 short, correct answer stored in the "answer" field.
  - TRUE_FALSE: 1 question + 2 options (TRUE and FALSE), exactly 1 correct.
    Use "correct_index" (integer) for the correct answer.
- Consider difficulty (complexity & scope)

Response format: JSON array with objects:
- SCQ:          { "stem": "Question text...", "type": "SCQ", "choices": ["A","B","C","D"], "correct_index": 2, "rationale": "Explanation...", "difficulty": "..."}
- MCQ:          { "stem": "Question text...", "type": "MCQ", "choices": ["A","B","C","D","E"], "correct_indices": [0, 2], "rationale": "A and C are correct because...", "difficulty": "..."}
- Short answer: { "stem": "Question text...", "type": "SHORT_ANSWER", "answer": "Correct answer here", "difficulty": "..."}
- TRUE_FALSE:   { "stem": "Question text...", "type": "TRUE_FALSE", "choices": ["TRUE","FALSE"], "correct_index": 0, "rationale": "Explanation...", "difficulty": "..."}

{% if previous_error is defined and previous_error %}
FEEDBACK:
{{ previous_error }}

Attempt {{ attempt }} – please fix the issue.
{% endif %}
$$
);

-- IMPROVE (en)
INSERT INTO prompt_templates (stage, language, template)
VALUES (
           'IMPROVE',
           'en',
           $$
               Improve the following exam questions linguistically and didactically without changing their core:

{{questions_raw}}

Optimization rules:
- clear, unambiguous formulations
- correct and consistent terminology
- plausible and distinguishable SCQ/MCQ options
- refine rationale, brief and evidence-based
- For MCQ questions: keep correct_indices as an array, never switch to correct_index
- For SCQ questions: keep correct_index as an integer, never switch to correct_indices
- No hints about internal evaluation process

               Response format: same structure as input (JSON array).

               {% if previous_error is defined and previous_error %}
               FEEDBACK:
               {{ previous_error }}

               Attempt {{ attempt }} – please fix the issue.
{% endif %}
$$
);
