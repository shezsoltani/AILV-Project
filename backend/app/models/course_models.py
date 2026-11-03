from datetime import datetime
from typing import List
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class CourseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Bezeichnung der Lehrveranstaltung")

    @field_validator("name")
    def validate_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Course name must not be empty or whitespace only")
        if len(trimmed) > 255:
            raise ValueError("Course name must not exceed 255 characters")
        return trimmed


class CourseUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Neue Bezeichnung der Lehrveranstaltung")

    @field_validator("name")
    def validate_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Course name must not be empty or whitespace only")
        if len(trimmed) > 255:
            raise ValueError("Course name must not exceed 255 characters")
        return trimmed


class CourseResponse(BaseModel):
    id: UUID
    name: str
    created_at: datetime
    question_count: int = 0


class CourseDeleteResponse(BaseModel):
    success: bool
    course_id: UUID
    removed_assignments: int


class QuestionCoursesAssignmentRequest(BaseModel):
    course_ids: List[UUID] = Field(default_factory=list, description="Liste von LV-IDs")


class QuestionCoursesAssignmentResponse(BaseModel):
    question_id: UUID
    course_ids: List[UUID] = Field(default_factory=list)
