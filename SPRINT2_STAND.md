# Sprint 2 - Projektstand und Status

## 📋 Sprint-Ziele

**Sprint 2 Ziel:** Erste Weboberfläche mit Eingabefeldern  
**Aufwand:** 70 Std.

**Aktivitäten:**
- Implementierung der Basisoberfläche mit React (Formulare, Navigation, Layout)
- Definition erster REST-Endpunkte im Python-Backend (z. B. /generate) für Testdaten
- Aufsetzten einer Datenbank (PostgreSQL)

---

## ✅ Was wurde erledigt?

### 1. REST-Endpunkte im Backend ✅

#### Implementierte Endpunkte:

**GET /health**
```python
@app.get("/health")
def health():
    return {"status": "ok", "message": "Backend läuft!"}
```
- ✅ Status: Implementiert und funktionsfähig

**POST /api/generate**
```python
@router.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    """
    Nimmt Eingabeparameter entgegen und gibt Testdaten zurück.
    (LLM-Integration folgt später)
    """
    result = generate_test_data(req)
    return result
```
- ✅ Status: Implementiert mit Testdaten-Generator
- ✅ Nimmt `GenerateRequest` entgegen (Pydantic-Modell)
- ✅ Gibt `GenerateResponse` mit generierten Testfragen zurück
- ⚠️ **Hinweis:** Verwendet aktuell nur Mock-Daten, keine LLM-Integration

#### Datenmodelle:

**GenerateRequest** - Vollständig implementiert mit allen Parametern:
- `topic` (string, min 3 Zeichen): Thema oder Kapitel
- `language` (enum: "de" | "en"): Sprache der Fragen
- `count` (int, 1-50): Anzahl der Fragen
- `types` (List[str]): Fragetypen (z.B. ["MCQ"])
- `difficulty_distribution` (Dict[str, int]): Prozentuale Aufteilung
- `learning_objectives` (Optional[List[str]]): Lernziele
- `bloom_level` (Optional[str]): Bloom-Taxonomie Stufe
- `target_audience` (Optional[str]): Zielgruppe
- `context_text` (Optional[str]): Kontexttext aus Skripten

**GenerateResponse** - Vollständig implementiert:
- `accepted` (bool)
- `topic`, `language`, `count` (string, string, int)
- `questions` (List[GeneratedQuestion])
- `note` (string)

**GeneratedQuestion**:
- `question` (string)
- `type` (string)
- `difficulty` (string)

#### Service-Logik:

**generator_service.py** - Testdaten-Generator:
```python
def generate_test_data(req: GenerateRequest) -> GenerateResponse:
    """Erzeugt Dummy-Fragen, um den Endpunkt zu testen."""
    # Generiert Fragen basierend auf Request-Parametern
```
- ✅ Status: Implementiert und funktionsfähig
- ✅ Generiert Testfragen entsprechend den Request-Parametern
- ⚠️ **Hinweis:** Nur Mock-Daten, keine echte LLM-Integration

---

### 2. Datenbank (PostgreSQL) ✅

#### Docker Compose Konfiguration:
- ✅ PostgreSQL 15 Container ist konfiguriert
- ✅ Port: 5432
- ✅ Datenbank: `aildb`
- ✅ User/Pass: `postgres/postgres`
- ✅ Volume für persistente Daten
- ✅ Automatische Initialisierung über `init.sql`

#### Datenbank-Schema:

**Tabellen definiert:**

1. **users** (für zukünftige Erweiterungen)
   - id (UUID, PK)
   - name, email

2. **generation_requests** (Haupttabelle für Anfragen)
   - id (UUID, PK)
   - user_id (FK zu users)
   - topic, language, count
   - types (JSONB)
   - difficulty_distribution (JSONB)
   - learning_objectives (JSONB)
   - bloom_level, target_audience, context_text
   - attachments (JSONB)
   - status, created_at
   - ✅ Index auf user_id

3. **prompts** (LLM-Prompts und Antworten)
   - id (UUID, PK)
   - request_id (FK zu generation_requests)
   - stage (SKELETON, CONTENT, VERIFY)
   - prompt_text, response_text
   - created_at
   - ✅ Index auf request_id

4. **questions** (Generierte Fragen)
   - id (UUID, PK)
   - request_id (FK zu generation_requests)
   - prompt_id (FK zu prompts)
   - type, difficulty, stem
   - choices (JSONB für MCQ)
   - correct_index
   - rationale, learning_objective, bloom_level
   - quality_score, tags (JSONB)
   - created_at
   - ✅ Index auf request_id

**Status:** ✅ Vollständig implementiert und initialisiert

---

### 3. Frontend - Basisstruktur ⚠️

#### Was vorhanden ist:

**Projekt-Setup:**
- ✅ React 18.2.0 mit TypeScript
- ✅ Vite 5.0.0 als Build-Tool
- ✅ TypeScript-Konfiguration
- ✅ Basis-Styling (index.css)

**App.tsx - Minimaler Stand:**
```tsx
function App() {
  return (
    <div className="app">
      <h1>AILV Project</h1>
      <p>Prüfungsfragen Generator</p>
    </div>
  )
}
```
- ✅ Status: Basis-React-App funktioniert
- ⚠️ **Problem:** Nur Platzhalter, keine Funktionalität

**Ordner-Struktur:**
- ✅ `src/components/` - Ordner vorhanden (aber leer)
- ✅ `src/pages/` - Ordner vorhanden (aber leer)
- ✅ `src/index.tsx` - Entry Point funktioniert

**Docker Integration:**
- ✅ Frontend-Container in docker-compose.yml
- ✅ Port: 3000
- ✅ Environment: `VITE_API_BASE=http://localhost:8000`

---

## ❌ Was fehlt noch?

### 1. Frontend - Formulare ❌

**Fehlende Komponenten:**

#### Formular-Komponente für GenerateRequest:
- ❌ **Keine Eingabefelder vorhanden**
  - Kein Input-Feld für `topic`
  - Kein Select/Dropdown für `language`
  - Kein Number-Input für `count`
  - Kein Multi-Select für `types` (MCQ, Kurzantwort, etc.)
  - Keine Slider/Inputs für `difficulty_distribution`
  - Keine Textarea für `learning_objectives`
  - Kein Input für `bloom_level`
  - Kein Input für `target_audience`
  - Keine Textarea für `context_text`

- ❌ **Keine Form-Validierung**
- ❌ **Kein Submit-Button**
- ❌ **Keine Form-State-Verwaltung**

**Benötigte Features:**
- Formular-Komponente mit allen Eingabefeldern
- React State Management (useState oder Form-Library)
- Validierung der Eingaben
- Submit-Handler

---

### 2. Frontend - API-Integration ❌

**Fehlende Funktionalität:**

- ❌ **Kein API-Client**
  - Keine axios/fetch Implementierung
  - Keine Funktion zum Aufruf von `/api/generate`
  - Keine Error-Handling für API-Calls

- ❌ **Keine Anzeige der Ergebnisse**
  - Keine Komponente zur Darstellung der generierten Fragen
  - Keine Liste/Karte für `GeneratedQuestion`
  - Keine Loading-States
  - Keine Error-Messages

**Benötigte Features:**
- API-Client-Service/Funktion
- Integration des Formulars mit Backend
- Ergebnis-Anzeige-Komponente
- Loading-Indikatoren
- Error-Handling

---

### 3. Frontend - Navigation ❌

**Fehlende Features:**

- ❌ **Kein Routing**
  - React Router nicht installiert
  - Keine Route-Definitionen
  - Keine Navigation zwischen Seiten

- ❌ **Kein Layout**
  - Keine Header/Navbar-Komponente
  - Keine Footer-Komponente
  - Kein gemeinsames Layout für alle Seiten

**Benötigte Packages:**
- `react-router-dom` für Routing

**Benötigte Komponenten:**
- Layout-Komponente
- Navigation-Komponente
- Route-Definitionen

---

### 4. Frontend - Layout & Styling ❌

**Aktueller Stand:**
- ✅ Basis CSS-Reset vorhanden
- ✅ Minimale App-Styles (zentrierter Text)

**Fehlende Features:**

- ❌ **Kein vollständiges Layout**
  - Kein Header mit Navigation
  - Keine Sidebar (falls benötigt)
  - Keine Footer
  - Kein strukturiertes Grid/Layout

- ❌ **Keine UI-Komponenten**
  - Keine Button-Komponenten
  - Keine Input-Komponenten
  - Keine Card-Komponenten
  - Keine Modal-Komponenten

- ❌ **Kein Design-System**
  - Keine Farb-Palette definiert
  - Keine Typografie-System
  - Keine Spacing-System
  - Keine UI-Library (Tailwind, Material-UI, etc.)

**Empfehlung:**
- Installation einer UI-Library (z.B. Tailwind CSS, Material-UI, Chakra UI)
- Oder Erstellung eines eigenen Design-Systems

---

## 📊 Sprint 2 - Erfüllungsgrad

### Erfüllung der Sprint-Aktivitäten:

| Aktivität | Status | Erfüllungsgrad |
|-----------|--------|----------------|
| REST-Endpunkte im Backend (`/generate`) für Testdaten | ✅ Erledigt | 100% |
| Aufsetzen einer Datenbank (PostgreSQL) | ✅ Erledigt | 100% |
| Basisoberfläche mit React | ⚠️ Teilweise | 20% |
| Formulare | ❌ Nicht erledigt | 0% |
| Navigation | ❌ Nicht erledigt | 0% |
| Layout | ❌ Nicht erledigt | 10% |

### Gesamt-Erfüllungsgrad Sprint 2: ~40%

**Backend:** ✅ 100% (REST-Endpunkt und DB vollständig)  
**Frontend:** ⚠️ ~15% (Nur Basisstruktur, keine Funktionalität)

---

## 🎯 Nächste Schritte (Prioritäten)

### Sofort erforderlich für Sprint 2 Abschluss:

1. **Formular-Komponente implementieren**
   - Erstellen einer `GenerateForm.tsx` Komponente
   - Alle Eingabefelder für `GenerateRequest` Parameter
   - Form-State Management mit `useState` oder `react-hook-form`
   - Validierung der Eingaben

2. **API-Integration implementieren**
   - API-Client-Funktion für `/api/generate`
   - Integration in Formular (onSubmit)
   - Error-Handling und Loading-States

3. **Ergebnis-Anzeige implementieren**
   - Komponente zur Darstellung der generierten Fragen
   - Liste/Karten für `GeneratedQuestion`

4. **Navigation einrichten**
   - React Router installieren
   - Basis-Routing implementieren
   - Navigation zwischen Formular und Ergebnis-Seite

5. **Layout verbessern**
   - Header/Navigation-Komponente
   - Gemeinsames Layout
   - Besseres Styling

---

## 📝 Zusammenfassung

### ✅ Stark (Backend & Datenbank):
- REST-Endpunkt `/api/generate` vollständig implementiert
- Pydantic-Modelle vollständig definiert
- Testdaten-Generator funktionsfähig
- PostgreSQL-Datenbank vollständig aufgesetzt
- Datenbank-Schema komplett definiert

### ⚠️ Schwach (Frontend):
- Nur minimale Basisstruktur vorhanden
- **Keine Formulare** - Hauptziel von Sprint 2 nicht erreicht
- **Keine Navigation** - Nicht implementiert
- **Kein Layout** - Nur Platzhalter
- **Keine API-Integration** - Frontend kann nicht mit Backend kommunizieren

### 🎯 Fokus für Sprint 2 Abschluss:
**Frontend-Implementierung ist kritisch!**  
Die Backend-Infrastruktur ist solide, aber ohne Frontend-Formulare kann das System nicht genutzt werden.

---

**Status:** Sprint 2 ist zu ~40% abgeschlossen  
**Hauptherausforderung:** Frontend-Implementierung (Formulare, Navigation, Layout)  
**Empfohlener nächster Schritt:** Implementierung der Formular-Komponente mit allen Eingabefeldern

