# backend/app/api/routes_courses.py
# API-Endpunkte für Lehrveranstaltungen (LV)

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..core.auth_utils import get_current_user
from ..db import get_db
from ..models.course_models import (
    CourseCreate,
    CourseDeleteResponse,
    CourseResponse,
    CourseUpdate,
)
from ..models.sql_models import User
from ..services import course_service

router = APIRouter(tags=["Courses"])


@router.get("/courses", response_model=List[CourseResponse])
def get_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[CourseResponse]:
    """Gibt alle Lehrveranstaltungen des eingeloggten Benutzers zurück."""
    return course_service.list_courses(db, current_user.id)


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CourseResponse:
    """Legt eine neue Lehrveranstaltung für den eingeloggten Benutzer an."""
    return course_service.create_course(db, current_user.id, payload)


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CourseResponse:
    """Ruft eine einzelne Lehrveranstaltung des Benutzers ab."""
    return course_service.get_course(db, current_user.id, course_id)


@router.put("/courses/{course_id}", response_model=CourseResponse)
@router.patch("/courses/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: UUID,
    payload: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CourseResponse:
    """Benennt eine bestehende Lehrveranstaltung um."""
    return course_service.update_course(db, current_user.id, course_id, payload)


@router.delete("/courses/{course_id}", response_model=CourseDeleteResponse)
def delete_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CourseDeleteResponse:
    """Löscht eine Lehrveranstaltung und entfernt Zuordnungen. Fragen bleiben erhalten."""
    return course_service.delete_course(db, current_user.id, course_id)
