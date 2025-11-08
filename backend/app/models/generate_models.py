from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from enum import Enum

class Language(str, Enum):
    de = "de"
    en = "en"

# --- Eingabeparameter laut Architekturübersicht ---
class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, description="Thema oder Kapitel")
    language: Language = Field(Language.de, description="Sprache (ISO-Code), z.B. 'de' oder 'en'")
    count: int = Field(10, ge=1, le=50, description="Anzahl der Fragen")
    types: List[str] = Field(default_factory=lambda: ["MCQ"], description="Fragetypen")
    difficulty_distribution: Dict[str, int] = Field(
        default_factory=lambda: {"easy": 50, "medium": 30, "hard": 20},
        description="Prozentuale Aufteilung der Schwierigkeitsgrade"
    )
    learning_objectives: Optional[List[str]] = Field(None, description="Lernziele")
    bloom_level: Optional[str] = Field(None, description="Kognitive Lernstufe (Bloom)")
    target_audience: Optional[str] = Field(None, description="Zielgruppe")
    context_text: Optional[str] = Field(None, description="Kontexttext aus Skripten")

# --- Rückgabeobjekt ---
class GeneratedQuestion(BaseModel):
    question: str
    type: str
    difficulty: str

class GenerateResponse(BaseModel):
    accepted: bool
    topic: str
    language: str
    count: int
    questions: List[GeneratedQuestion]
    note: str = "Dies sind Testdaten. LLM-Aufruf folgt später."
