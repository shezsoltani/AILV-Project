from typing import Optional, Protocol
from uuid import UUID
from sqlalchemy.orm import Session

from ...models.generate_models import GenerateRequest
from ...models.sql_models import (
    GenerationRequest as ORMGenerationRequest,
    PromptEntry,
    GeneratedQuestion as ORMGeneratedQuestion,
    GeneratedSlide as ORMGeneratedSlide,
)
from ...persistence.generation_repo import create_generation_request_db, get_generation_request
from ...persistence.prompt_repo import get_latest_prompt_by_stage
from ...persistence.generated_questions_repo import store_generated_questions
from ...persistence.slides_draft_repo import store_generated_slides


class QuestionGenerationPersistence(Protocol):
    def create_or_load_request(
        self,
        db: Session,
        *,
        req: GenerateRequest,
        user_id: UUID,
        existing_request_id: Optional[UUID] = None,
    ) -> ORMGenerationRequest: ...

    def get_latest_prompt(
        self,
        db: Session,
        *,
        request_id: UUID,
        stage: str,
    ) -> Optional[PromptEntry]: ...

    def store_questions(
        self,
        db: Session,
        *,
        request_id: UUID,
        prompt_id: UUID,
        stage: str,
        questions: list[dict],
    ) -> list[ORMGeneratedQuestion]: ...


class SlidesGenerationPersistence(Protocol):
    def create_or_load_request(
        self,
        db: Session,
        *,
        req: GenerateRequest,
        user_id: UUID,
        existing_request_id: Optional[UUID] = None,
        slide_count: Optional[int] = None,
    ) -> ORMGenerationRequest: ...

    def get_latest_prompt(
        self,
        db: Session,
        *,
        request_id: UUID,
        stage: str,
    ) -> Optional[PromptEntry]: ...

    def store_slides(
        self,
        db: Session,
        *,
        request_id: UUID,
        prompt_id: UUID,
        stage: str,
        slides: list[dict],
    ) -> list[ORMGeneratedSlide]: ...


class SqlQuestionGenerationPersistence:
    def create_or_load_request(
        self,
        db: Session,
        *,
        req: GenerateRequest,
        user_id: UUID,
        existing_request_id: Optional[UUID] = None,
    ) -> ORMGenerationRequest:
        if existing_request_id is not None:
            return get_generation_request(db, existing_request_id)
        return create_generation_request_db(db, req, user_id)

    def get_latest_prompt(
        self,
        db: Session,
        *,
        request_id: UUID,
        stage: str,
    ) -> Optional[PromptEntry]:
        return get_latest_prompt_by_stage(db=db, request_id=request_id, stage=stage)

    def store_questions(
        self,
        db: Session,
        *,
        request_id: UUID,
        prompt_id: UUID,
        stage: str,
        questions: list[dict],
    ) -> list[ORMGeneratedQuestion]:
        return store_generated_questions(
            db=db,
            request_id=request_id,
            prompt_id=prompt_id,
            stage=stage,
            questions=questions,
        )


class SqlSlidesGenerationPersistence:
    def create_or_load_request(
        self,
        db: Session,
        *,
        req: GenerateRequest,
        user_id: UUID,
        existing_request_id: Optional[UUID] = None,
        slide_count: Optional[int] = None,
    ) -> ORMGenerationRequest:
        if existing_request_id is not None:
            return get_generation_request(db, existing_request_id)
        return create_generation_request_db(
            db,
            req,
            user_id=user_id,
            request_type="slides",
            slide_count=slide_count,
        )

    def get_latest_prompt(
        self,
        db: Session,
        *,
        request_id: UUID,
        stage: str,
    ) -> Optional[PromptEntry]:
        return get_latest_prompt_by_stage(db=db, request_id=request_id, stage=stage)

    def store_slides(
        self,
        db: Session,
        *,
        request_id: UUID,
        prompt_id: UUID,
        stage: str,
        slides: list[dict],
    ) -> list[ORMGeneratedSlide]:
        return store_generated_slides(
            db=db,
            request_id=request_id,
            prompt_id=prompt_id,
            stage=stage,
            slides=slides,
        )
