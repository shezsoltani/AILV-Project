# app/models/generate_models.py
from uuid import UUID
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from enum import Enum

class Language(str, Enum):
    de = "de"
    en = "en"

class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, description="Thema oder Kapitel")
    language: Language = Field(Language.de, description="Sprache (ISO-Code), z.B. 'de' oder 'en'")
    count: int = Field(10, ge=1, le=50, description="Anzahl der Fragen")
    types: List[str] = Field(default_factory=lambda: ["MCQ"], description="Fragetypen")
    difficulty_distribution: Dict[str, int] = Field(
        default_factory=lambda: {"easy": 50, "medium": 30, "hard": 20},
        description="Prozentuale Aufteilung der Schwierigkeitsgrade"
    )
    # -> keine learning_objectives, bloom_level, target_audience, context_text im API-Modell

class GeneratedQuestion(BaseModel):
    id: Optional[UUID] = None
    question: str
    type: str
    difficulty: str

    choices: Optional[List[str]] = None
    correct_index: Optional[int] = None
    rationale: Optional[str] = None

class GenerateResponse(BaseModel):
    accepted: bool
    request_id: UUID   #NEU
    topic: str
    language: str
    count: int
    questions: List[GeneratedQuestion]
    note: str
