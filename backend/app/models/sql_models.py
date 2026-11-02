# app/models/sql_models.py
from sqlalchemy import Column, String, Text, TIMESTAMP, func, Integer, ForeignKey, Boolean, Index, CheckConstraint, PrimaryKeyConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.types import Uuid
import uuid
from uuid import UUID
from .base import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(TIMESTAMP, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    user = relationship("User")

class PromptTemplate(Base):
    __tablename__ = "prompt_templates"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    stage = Column(String(50), nullable=False)
    language = Column(String(8), nullable=False, server_default="de")
    template = Column(Text, nullable=False)


class PromptEntry(Base):
    __tablename__ = "prompts"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    request_id = Column(Uuid, ForeignKey("generation_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    generation_request = relationship("GenerationRequest", back_populates="prompt_entries")
    stage = Column(String(50), nullable=False)
    prompt_text = Column(Text, nullable=False)
    response_text = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)


class GenerationRequest(Base):
    __tablename__ = "generation_requests"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    request_type = Column(String(20), nullable=False, server_default="questions")  # 'questions' | 'slides'
    topic = Column(Text, nullable=False)
    language = Column(String(10), nullable=False)
    count = Column(Integer, nullable=False, server_default="1")       # nur bei request_type='questions'
    slide_count = Column(Integer, nullable=True)                      # nur bei request_type='slides'
    types = Column(JSONB, nullable=False, server_default="[]")
    difficulty_distribution = Column(JSONB, nullable=True)
    context_text = Column(Text, nullable=True)
    upload_context = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    user = relationship("User")
    prompt_entries = relationship("PromptEntry", back_populates="generation_request", cascade="all, delete-orphan")


class GeneratedQuestion(Base):
    __tablename__ = "generated_questions"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    request_id = Column(Uuid, ForeignKey("generation_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt_id = Column(Uuid, ForeignKey("prompts.id", ondelete="CASCADE"), nullable=False, index=True)
    stage = Column(String(50), nullable=False)
    type = Column(String(50), nullable=True)
    difficulty = Column(String(20), nullable=True)
    stem = Column(Text, nullable=True)
    choices = Column(JSONB, nullable=True)
    correct_index = Column(Integer, nullable=True)
    correct_indices = Column(JSONB, nullable=True)
    answer = Column(Text, nullable=True)
    rationale = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    prompt = relationship("PromptEntry")
    generation_request = relationship("GenerationRequest")


class Question(Base):
    __tablename__ = "questions"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    request_id = Column(Uuid, ForeignKey("generation_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt_id = Column(Uuid, ForeignKey("prompts.id", ondelete="SET NULL"), nullable=True, index=True)
    type = Column(String(50), nullable=True)
    difficulty = Column(String(20), nullable=True)
    stem = Column(Text, nullable=True)
    choices = Column(JSONB, nullable=True)
    correct_index = Column(Integer, nullable=True)
    correct_indices = Column(JSONB, nullable=True)
    answer = Column(Text, nullable=True)
    rationale = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    generation_request = relationship("GenerationRequest")
    prompt = relationship("PromptEntry")
    # Optionale Zuordnung zu LVs (N:M, SCRUM-6). Keine Kaskade: Loeschen entfernt nur Zuordnungszeilen.
    courses = relationship("Course", secondary="question_courses", back_populates="questions", passive_deletes=True)


class Course(Base):
    """Lehrveranstaltung (LV). Gehoert genau einem Benutzer (user_id)."""
    __tablename__ = "courses"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User")
    # Bewusst KEIN cascade="delete": Loeschen einer LV loescht nie Fragen, nur Zuordnungen.
    questions = relationship("Question", secondary="question_courses", back_populates="courses", passive_deletes=True)

    __table_args__ = (
        CheckConstraint("length(btrim(name)) > 0", name="chk_course_name_not_blank"),
        Index("uq_courses_user_name", "user_id", func.lower(name), unique=True),
    )


class QuestionCourse(Base):
    """Zuordnung Frage <-> LV. Primaerschluessel verhindert doppelte Zuordnungen."""
    __tablename__ = "question_courses"
    question_id = Column(Uuid, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(Uuid, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (PrimaryKeyConstraint("question_id", "course_id"),)


class GeneratedSlide(Base):
    __tablename__ = "generated_slides"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    request_id = Column(Uuid, ForeignKey("generation_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt_id = Column(Uuid, ForeignKey("prompts.id", ondelete="CASCADE"), nullable=False)
    stage = Column(String(50), nullable=False)
    position = Column(Integer, nullable=False)
    slide_type = Column(String(50), nullable=True)
    title = Column(Text, nullable=True)
    bullets = Column(JSONB, nullable=True)
    examples = Column(JSONB, nullable=True, server_default="[]")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    generation_request = relationship("GenerationRequest")
    prompt_entry = relationship("PromptEntry")


class SlideDeck(Base):
    __tablename__ = "slide_decks"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    request_id = Column(Uuid, ForeignKey("generation_requests.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    user = relationship("User")
    slides = relationship("Slide", back_populates="deck", cascade="all, delete-orphan", order_by="Slide.position")


class Slide(Base):
    __tablename__ = "slides"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    deck_id = Column(Uuid, ForeignKey("slide_decks.id", ondelete="CASCADE"), nullable=False, index=True)
    position = Column(Integer, nullable=False)
    slide_type = Column(String(50), nullable=True)
    title = Column(Text, nullable=True)
    bullets = Column(JSONB, nullable=True)
    examples = Column(JSONB, nullable=True, server_default="[]")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    deck = relationship("SlideDeck", back_populates="slides")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    job_type = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, server_default="pending")
    progress = Column(Integer, nullable=False, server_default="0")
    batch_current = Column(Integer, nullable=False, server_default="0")
    batch_total = Column(Integer, nullable=False, server_default="1")
    batch_retrying = Column(Boolean, nullable=False, server_default="false")
    stage_label = Column(String(100), nullable=True)
    request_data = Column(JSONB, nullable=True)
    result_data = Column(JSONB, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")