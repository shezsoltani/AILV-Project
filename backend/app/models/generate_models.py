# app/models/generate_models.py
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional
from enum import Enum

class Language(str, Enum):
    de = "de"
    en = "en"

class GenerateRequest(BaseModel):
    provider: str = "openai"
    model: Optional[str] = None
    topic: str = Field(..., min_length=3, description="Thema oder Kapitel")
    language: Language = Field(Language.de, description="Sprache (ISO-Code), z.B. 'de' oder 'en'")
    count: int = Field(10, ge=1, le=50, description="Anzahl der Fragen")
    types: List[str] = Field(default_factory=lambda: ["SCQ"], description="Fragetypen: SCQ, MCQ, SHORT_ANSWER, TRUE_FALSE")
    difficulty_distribution: Dict[str, int] = Field(
        default_factory=lambda: {"easy": 50, "medium": 30, "hard": 20},
        description="Prozentuale Aufteilung der Schwierigkeitsgrade"
    )
    context_text: Optional[str] = None
    upload_context: Optional[str] = None
    custom_prompts: Optional[Dict[str, str]] = None
    # Optionale LV-Auswahl (SCRUM-43). Leere Liste = allgemeine Fragen.
    # Wird nur mit dem Auftrag gespeichert und nicht in die KI-Prompts eingebaut.
    course_ids: List[UUID] = Field(
        default_factory=list,
        description="IDs eigener Lehrveranstaltungen; leer = keine LV / allgemein",
    )
    # -> kein target_audience im API-Modell

    @field_validator("course_ids")
    @classmethod
    def _remove_duplicate_course_ids(cls, value: List[UUID]) -> List[UUID]:
        return list(dict.fromkeys(value))

class GeneratedQuestion(BaseModel):
    id: Optional[UUID] = None
    question: str
    type: str
    difficulty: str

    choices: Optional[List[str]] = None
    correct_index: Optional[int] = None
    correct_indices: Optional[List[int]] = None
    answer: Optional[str] = None  # for SHORT_ANSWER: correct answer
    rationale: Optional[str] = None
    course_ids: List[UUID] = Field(default_factory=list)

class GenerateResponse(BaseModel):
    accepted: bool
    request_id: UUID   #NEU
    topic: str
    language: str
    count: int
    questions: List[GeneratedQuestion]
    note: str
