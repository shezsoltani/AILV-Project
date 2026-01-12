# backend\app\models\archive_models.py
# Pydantic-Modelle für das Archiv finalisierter Fragen

from uuid import UUID
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

from .generate_models import GeneratedQuestion


# Einzelnes Archiv-Thema mit Metadaten
class ArchiveTopicResponse(BaseModel):
    request_id: UUID
    topic: str
    language: str
    question_count: int
    types: List[str] = Field(default_factory=list)  # Fragetypen (MCQ, SHORT_ANSWER, TRUE_FALSE)
    created_at: datetime
    finalized_at: datetime


# Liste aller Archiv-Themen
class ArchiveTopicsResponse(BaseModel):
    topics: List[ArchiveTopicResponse] = Field(default_factory=list)


# Alle finalisierten Fragen zu einem Archiv-Thema
class ArchiveQuestionsResponse(BaseModel):
    request_id: UUID
    topic: str
    language: str
    questions: List[GeneratedQuestion] = Field(default_factory=list)
