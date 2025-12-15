# app/models/sql_models.py
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, String, Text, TIMESTAMP, func, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
from datetime import datetime

Base = declarative_base() #---erzeugt eine Basisklasse für SQLAlchemy ORM-Modelle

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

    id: Mapped[int] = mapped_column(primary_key=True)

    request_id: Mapped[int] = mapped_column(
        ForeignKey("generation_requests.id"),
        nullable=False
    )

    stage: Mapped[str] = mapped_column(nullable=False)

    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)

    response_text: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


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
