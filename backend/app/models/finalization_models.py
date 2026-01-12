from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional

class FinalQuestion(BaseModel):
    generated_question_id: UUID

    type: Optional[str] = None
    difficulty: Optional[str] = None
    stem: Optional[str] = None
    choices: Optional[list] = None
    correct_index: Optional[int] = None
    answer: Optional[str] = None  # for SHORT_ANSWER: correct answer
    rationale: Optional[str] = None

class FinalizeQuestionsRequest(BaseModel):
    request_id: UUID
    questions: List[FinalQuestion]


class FinalizeQuestionsResponse(BaseModel):
    success: bool
    request_id: UUID
    finalized_count: int
    message: str

