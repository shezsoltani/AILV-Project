# backend/app/persistence/course_repo.py
from typing import Dict, List, Optional
from uuid import UUID
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.sql_models import Course, GenerationRequest, Question, QuestionCourse


def get_courses_by_user(db: Session, user_id: UUID) -> List[tuple[Course, int]]:
    results = (
        db.query(
            Course,
            func.count(QuestionCourse.question_id).label("question_count"),
        )
        .outerjoin(QuestionCourse, Course.id == QuestionCourse.course_id)
        .filter(Course.user_id == user_id)
        .group_by(Course.id)
        .order_by(Course.created_at.asc())
        .all()
    )
    return results


def get_course_by_id_and_user(
    db: Session, course_id: UUID, user_id: UUID
) -> Optional[Course]:
    return (
        db.query(Course)
        .filter(Course.id == course_id, Course.user_id == user_id)
        .first()
    )


def get_course_by_name_and_user(
    db: Session, name: str, user_id: UUID, exclude_id: Optional[UUID] = None
) -> Optional[Course]:
    query = db.query(Course).filter(
        Course.user_id == user_id,
        func.lower(Course.name) == func.lower(name.strip()),
    )
    if exclude_id is not None:
        query = query.filter(Course.id != exclude_id)
    return query.first()


def get_course_question_count(db: Session, course_id: UUID) -> int:
    return (
        db.query(func.count(QuestionCourse.question_id))
        .filter(QuestionCourse.course_id == course_id)
        .scalar()
        or 0
    )


def create_course(db: Session, user_id: UUID, name: str) -> Course:
    course = Course(user_id=user_id, name=name.strip())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def update_course(db: Session, course: Course, name: str) -> Course:
    course.name = name.strip()
    db.commit()
    db.refresh(course)
    return course


def delete_course(db: Session, course: Course) -> int:
    removed_assignments = (
        db.query(func.count(QuestionCourse.question_id))
        .filter(QuestionCourse.course_id == course.id)
        .scalar()
        or 0
    )
    db.delete(course)
    db.commit()
    return removed_assignments


def get_courses_by_ids_and_user(
    db: Session, course_ids: List[UUID], user_id: UUID
) -> List[Course]:
    if not course_ids:
        return []
    return (
        db.query(Course)
        .filter(Course.user_id == user_id, Course.id.in_(course_ids))
        .all()
    )


def get_question_by_id_and_user(
    db: Session, question_id: UUID, user_id: UUID
) -> Optional[Question]:
    return (
        db.query(Question)
        .join(GenerationRequest, Question.request_id == GenerationRequest.id)
        .filter(Question.id == question_id, GenerationRequest.user_id == user_id)
        .first()
    )


def get_course_ids_for_question(db: Session, question_id: UUID) -> List[UUID]:
    rows = (
        db.query(QuestionCourse.course_id)
        .filter(QuestionCourse.question_id == question_id)
        .all()
    )
    return [r[0] for r in rows]


def get_course_ids_for_questions(
    db: Session, question_ids: List[UUID]
) -> Dict[UUID, List[UUID]]:
    if not question_ids:
        return {}
    rows = (
        db.query(QuestionCourse.question_id, QuestionCourse.course_id)
        .filter(QuestionCourse.question_id.in_(question_ids))
        .all()
    )
    result: Dict[UUID, List[UUID]] = {qid: [] for qid in question_ids}
    for qid, cid in rows:
        result[qid].append(cid)
    return result


def set_question_courses(
    db: Session, question_id: UUID, course_ids: List[UUID]
) -> List[UUID]:
    db.query(QuestionCourse).filter(QuestionCourse.question_id == question_id).delete(
        synchronize_session=False
    )
    unique_course_ids = list(dict.fromkeys(course_ids))
    for cid in unique_course_ids:
        qc = QuestionCourse(question_id=question_id, course_id=cid)
        db.add(qc)
    db.commit()
    return unique_course_ids
