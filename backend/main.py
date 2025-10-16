from enum import Enum
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI()

# --- Eingabe-Contract ---
class Language(str, Enum):
    de = "de"
    en = "en"

class ArtifactType(str, Enum):
    exam_questions = "exam_questions"
    slides = "slides"
    summary = "summary"

class Constraints(BaseModel):
    count: int = Field(5, ge=1, le=50, description="Anzahl zu generierender Elemente")

class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, description="Thema der Lehrunterlage")
    language: Language
    artifact_type: ArtifactType
    constraints: Constraints | None = None

# --- Routen ---
@app.get("/")
def root():
    return {"message": "AI-LV Assistant Backend ist aktiv"}

@app.get("/health")
def health():
    return {"status": "ok", "message": "Backend läuft!"}

@app.post("/generate")
def generate(req: GenerateRequest):
    # Stub in Sprint 1: wir 'bestätigen' nur und spiegeln die Anfrage zurück
    return {
        "accepted": True,
        "topic": req.topic,
        "language": req.language,
        "artifact_type": req.artifact_type,
        "constraints": req.constraints,
        "note": "LLM-Aufruf folgt in späterem Sprint"
    }
