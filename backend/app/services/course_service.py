# backend/app/services/course_service.py
from typing import List
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.course_models import (
    CourseCreate,
    CourseDeleteResponse,
    CourseResponse,
    CourseUpdate,
    QuestionCoursesAssignmentRequest,
    QuestionCoursesAssignmentResponse,
)
from ..persistence import course_repo


def list_courses(db: Session, user_id: UUID) -> List[CourseResponse]:
    rows = course_repo.get_courses_by_user(db, user_id)
    return [
        CourseResponse(
            id=course.id,
            name=course.name,
            created_at=course.created_at,
            question_count=q_count,
        )
        for course, q_count in rows
    ]


def create_course(
    db: Session, user_id: UUID, payload: CourseCreate
) -> CourseResponse:
    existing = course_repo.get_course_by_name_and_user(db, payload.name, user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A course with this name already exists",
        )

    course = course_repo.create_course(db, user_id, payload.name)
    return CourseResponse(
        id=course.id,
        name=course.name,
        created_at=course.created_at,
        question_count=0,
    )


def get_course(db: Session, user_id: UUID, course_id: UUID) -> CourseResponse:
    course = course_repo.get_course_by_id_and_user(db, course_id, user_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )
    question_count = course_repo.get_course_question_count(db, course.id)
    return CourseResponse(
        id=course.id,
        name=course.name,
        created_at=course.created_at,
        question_count=question_count,
    )


def update_course(
    db: Session, user_id: UUID, course_id: UUID, payload: CourseUpdate
) -> CourseResponse:
    course = course_repo.get_course_by_id_and_user(db, course_id, user_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    existing = course_repo.get_course_by_name_and_user(
        db, payload.name, user_id, exclude_id=course_id
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A course with this name already exists",
        )

    course = course_repo.update_course(db, course, payload.name)
    question_count = course_repo.get_course_question_count(db, course.id)
    return CourseResponse(
        id=course.id,
        name=course.name,
        created_at=course.created_at,
        question_count=question_count,
    )


def delete_course(
    db: Session, user_id: UUID, course_id: UUID
) -> CourseDeleteResponse:
    course = course_repo.get_course_by_id_and_user(db, course_id, user_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    removed = course_repo.delete_course(db, course)
    return CourseDeleteResponse(
        success=True,
        course_id=course_id,
        removed_assignments=removed,
    )


def ensure_courses_belong_to_user(
    db: Session, user_id: UUID, course_ids: List[UUID]
) -> List[UUID]:
    """Prüft, dass alle LVs existieren und dem Benutzer gehören.

    Gibt die IDs ohne Duplikate zurück. Unbekannte, gelöschte und fremde LVs
    ergeben einheitlich 404, damit keine fremden IDs preisgegeben werden.
    """
    unique_course_ids = list(dict.fromkeys(course_ids or []))
    if unique_course_ids:
        found_courses = course_repo.get_courses_by_ids_and_user(
            db, unique_course_ids, user_id
        )
        if len(found_courses) != len(unique_course_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )
    return unique_course_ids


def assign_courses_to_question(
    db: Session,
    user_id: UUID,
    question_id: UUID,
    payload: QuestionCoursesAssignmentRequest,
) -> QuestionCoursesAssignmentResponse:
    question = course_repo.get_question_by_id_and_user(db, question_id, user_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found",
        )

    unique_course_ids = ensure_courses_belong_to_user(
        db, user_id, payload.course_ids
    )

    updated_ids = course_repo.set_question_courses(db, question_id, unique_course_ids)
    return QuestionCoursesAssignmentResponse(
        question_id=question_id,
        course_ids=updated_ids,
    )
