from pydantic import BaseModel, Field, field_validator
from uuid import UUID
from typing import List, Optional

class FinalQuestion(BaseModel):
    generated_question_id: UUID

    type: Optional[str] = None
    difficulty: Optional[str] = None
    stem: Optional[str] = None
    choices: Optional[list] = None
    correct_index: Optional[int] = None
    correct_indices: Optional[List[int]] = None
    answer: Optional[str] = None  # for SHORT_ANSWER: correct answer
    rationale: Optional[str] = None

class FinalizeQuestionsRequest(BaseModel):
    request_id: UUID
    questions: List[FinalQuestion]
    # Optionale LV-Auswahl des gestarteten Auftrags (SCRUM-43).
    # Leere Liste = Fragen bleiben allgemein.
    course_ids: List[UUID] = Field(default_factory=list)

    @field_validator("course_ids")
    @classmethod
    def _remove_duplicate_course_ids(cls, value: List[UUID]) -> List[UUID]:
        return list(dict.fromkeys(value))


class FinalizeQuestionsResponse(BaseModel):
    success: bool
    request_id: UUID
    finalized_count: int
    message: str

