# app/models/sql_models.py
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, String, Text, TIMESTAMP, func, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
from datetime import datetime
from .base import Base

class PromptTemplate(Base):
    __tablename__ = "prompt_templates"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4()
    )
    stage = Column(String(50), nullable=False)
    language = Column(String(8), nullable=False, server_default="de")
    template = Column(Text, nullable=False)


class PromptEntry(Base):
    __tablename__ = "prompts"

    # UUID Primary Key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    # Sauberer Foreign Key
    request_id = Column(
        UUID(as_uuid=True),
        ForeignKey("generation_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Beziehung (optional, aber sehr sinnvoll)
    generation_request = relationship(
        "GenerationRequest",
        back_populates="prompt_entries",
    )

    # Stage: SKELETON / CONTENT / IMPROVE
    stage = Column(String(50), nullable=False)

    # Prompt & Response
    prompt_text = Column(Text, nullable=False)
    response_text = Column(Text, nullable=True)

class GenerationRequest(Base):
    __tablename__ = "generation_requests"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=func.uuid_generate_v4()
    )
    user_id = Column(UUID(as_uuid=True), nullable=True)
    topic = Column(Text, nullable=False)
    language = Column(String(10), nullable=False)
    count = Column(Integer, nullable=False, server_default="1")
    types = Column(JSONB, nullable=False, server_default="[]")
    difficulty_distribution = Column(JSONB, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    prompt_entries = relationship(
        "PromptEntry",
        back_populates="generation_request",
        cascade="all, delete-orphan"
    )
