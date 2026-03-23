# app/models/sql_models.py
from sqlalchemy import Column, String, Text, TIMESTAMP, func, Integer, ForeignKey, Boolean
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
    topic = Column(Text, nullable=False)
    language = Column(String(10), nullable=False)
    count = Column(Integer, nullable=False, server_default="1")
    types = Column(JSONB, nullable=False, server_default="[]")
    difficulty_distribution = Column(JSONB, nullable=True)
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
    answer = Column(Text, nullable=True)
    rationale = Column(Text, nullable=True)
    learning_objective = Column(Text, nullable=True)
    bloom_level = Column(String(50), nullable=True)
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
    answer = Column(Text, nullable=True)
    rationale = Column(Text, nullable=True)
    learning_objective = Column(Text, nullable=True)
    bloom_level = Column(String(50), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    generation_request = relationship("GenerationRequest")
    prompt = relationship("PromptEntry")