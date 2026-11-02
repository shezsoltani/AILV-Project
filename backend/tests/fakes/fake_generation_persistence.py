from dataclasses import dataclass, field
from typing import Optional
from uuid import UUID, uuid4


@dataclass
class FakeGenerationRequest:
    id: UUID
    topic: str = ""
    language: str = "de"
    request_type: str = "questions"
    count: int = 1
    slide_count: Optional[int] = None


@dataclass
class FakePromptEntry:
    id: UUID
    request_id: UUID
    stage: str


@dataclass
class FakeGeneratedQuestion:
    id: UUID
    type: Optional[str]
    difficulty: Optional[str]
    stem: Optional[str]
    choices: Optional[list] = None
    correct_index: Optional[int] = None
    correct_indices: Optional[list] = None
    answer: Optional[str] = None
    rationale: Optional[str] = None


@dataclass
class FakeGeneratedSlide:
    position: Optional[int]
    slide_type: Optional[str]
    title: Optional[str]
    bullets: list = field(default_factory=list)
    examples: list = field(default_factory=list)


@dataclass(frozen=True)
class RequestCall:
    req: object
    user_id: UUID
    existing_request_id: Optional[UUID]
    slide_count: Optional[int] = None


@dataclass(frozen=True)
class PromptLookupCall:
    request_id: UUID
    stage: str


@dataclass(frozen=True)
class StoreQuestionsCall:
    request_id: UUID
    prompt_id: UUID
    stage: str
    questions: list


@dataclass(frozen=True)
class StoreSlidesCall:
    request_id: UUID
    prompt_id: UUID
    stage: str
    slides: list


class FakeQuestionGenerationPersistence:
    def __init__(
        self,
        *,
        request: Optional[FakeGenerationRequest] = None,
        latest_prompt: Optional[FakePromptEntry] = None,
    ):
        self.request = request or FakeGenerationRequest(id=uuid4())
        self.latest_prompt = latest_prompt
        self.request_calls: list[RequestCall] = []
        self.prompt_lookup_calls: list[PromptLookupCall] = []
        self.store_calls: list[StoreQuestionsCall] = []

    def create_or_load_request(self, db, *, req, user_id, existing_request_id=None):
        self.request_calls.append(RequestCall(req, user_id, existing_request_id))
        return self.request

    def get_latest_prompt(self, db, *, request_id, stage):
        self.prompt_lookup_calls.append(PromptLookupCall(request_id, stage))
        if self.latest_prompt is None:
            self.latest_prompt = FakePromptEntry(id=uuid4(), request_id=request_id, stage=stage)
        return self.latest_prompt

    def store_questions(self, db, *, request_id, prompt_id, stage, questions):
        self.store_calls.append(StoreQuestionsCall(request_id, prompt_id, stage, questions))
        return [
            FakeGeneratedQuestion(
                id=uuid4(),
                type=q.get("type"),
                difficulty=q.get("difficulty"),
                stem=q.get("stem"),
                choices=q.get("choices"),
                correct_index=q.get("correct_index"),
                correct_indices=q.get("correct_indices"),
                answer=q.get("answer"),
                rationale=q.get("rationale"),
            )
            for q in questions
        ]


class FakeSlidesGenerationPersistence:
    def __init__(
        self,
        *,
        request: Optional[FakeGenerationRequest] = None,
        latest_prompt: Optional[FakePromptEntry] = None,
    ):
        self.request = request or FakeGenerationRequest(id=uuid4(), request_type="slides")
        self.latest_prompt = latest_prompt
        self.request_calls: list[RequestCall] = []
        self.prompt_lookup_calls: list[PromptLookupCall] = []
        self.store_calls: list[StoreSlidesCall] = []

    def create_or_load_request(
        self, db, *, req, user_id, existing_request_id=None, slide_count=None,
    ):
        self.request_calls.append(RequestCall(req, user_id, existing_request_id, slide_count))
        return self.request

    def get_latest_prompt(self, db, *, request_id, stage):
        self.prompt_lookup_calls.append(PromptLookupCall(request_id, stage))
        if self.latest_prompt is None:
            self.latest_prompt = FakePromptEntry(id=uuid4(), request_id=request_id, stage=stage)
        return self.latest_prompt

    def store_slides(self, db, *, request_id, prompt_id, stage, slides):
        self.store_calls.append(StoreSlidesCall(request_id, prompt_id, stage, slides))
        return [
            FakeGeneratedSlide(
                position=s.get("position"),
                slide_type=s.get("slide_type"),
                title=s.get("title"),
                bullets=s.get("bullets") or [],
                examples=s.get("examples") or [],
            )
            for s in slides
        ]
