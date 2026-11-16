import pytest
from uuid import uuid4
from pydantic import ValidationError

from app.models.course_models import (
    CourseCreate,
    CourseUpdate,
    QuestionCoursesAssignmentRequest,
)
from app.models.generate_models import GeneratedQuestion


def test_course_create_valid():
    model = CourseCreate(name="  Mathematik 1  ")
    assert model.name == "Mathematik 1"


def test_course_create_blank_fails():
    with pytest.raises(ValidationError):
        CourseCreate(name="   ")

    with pytest.raises(ValidationError):
        CourseCreate(name="")


def test_course_create_too_long_fails():
    with pytest.raises(ValidationError):
        CourseCreate(name="a" * 256)


def test_course_update_valid():
    model = CourseUpdate(name="Statistik")
    assert model.name == "Statistik"


def test_course_update_blank_fails():
    with pytest.raises(ValidationError):
        CourseUpdate(name="   ")


def test_question_courses_assignment_request():
    id1 = uuid4()
    id2 = uuid4()
    model = QuestionCoursesAssignmentRequest(course_ids=[id1, id2])
    assert model.course_ids == [id1, id2]

    empty = QuestionCoursesAssignmentRequest()
    assert empty.course_ids == []


def test_generated_question_has_course_ids():
    q = GeneratedQuestion(
        question="Was ist Python?",
        type="SCQ",
        difficulty="easy",
    )
    assert q.course_ids == []

    cid = uuid4()
    q2 = GeneratedQuestion(
        question="Was ist Python?",
        type="SCQ",
        difficulty="easy",
        course_ids=[cid],
    )
    assert q2.course_ids == [cid]
