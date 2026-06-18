# backend/app/api/routes_archive_export.py
# Export-Endpunkte für archivierte Fragen (PDF, später XML und PPTX)

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..core.auth_utils import get_current_user
from ..db import get_db
from ..models.sql_models import User, SlideDeck, GenerationRequest
from ..persistence.archive_repo import get_archive_questions
from ..services.moodle_export_service import build_moodle_xml
from ..services.pdf_export_service import build_questions_pdf, build_questions_pdf_exam
from ..services.pptx_export_service import build_slides_pptx

router = APIRouter()


@router.get("/archive/{request_id}/export/pdf")
def export_archive_pdf(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    # Archiv-Eintrag laden und Ownership prüfen
    generation_request, questions = get_archive_questions(db, request_id)

    if not generation_request:
        raise HTTPException(status_code=404, detail="Archiv-Eintrag nicht gefunden.")

    if generation_request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Zugriff verweigert.")

    if not questions:
        raise HTTPException(status_code=422, detail="Keine Fragen in diesem Archiv-Eintrag.")

    # SQL-Objekte in dicts umwandeln, die build_questions_pdf erwartet
    questions_dicts = [
        {
            "stem": q.stem or "",
            "type": q.type or "",
            "difficulty": q.difficulty or "",
            "choices": q.choices,
            "correct_index": q.correct_index,
            "correct_indices": q.correct_indices,
            "answer": q.answer,
            "rationale": q.rationale,
        }
        for q in questions
    ]

    topic = generation_request.topic or "Fragen"
    pdf_bytes = build_questions_pdf(questions=questions_dicts, topic=topic)

    safe_topic = topic.replace(" ", "_").replace("/", "-")
    filename = f"{safe_topic}_fragen.pdf"

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/archive/{request_id}/export/pdf/exam")
def export_archive_pdf_exam(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """Klausur-PDF aus dem Archiv: nur Fragen und Antwortoptionen, ohne Lösungen und Begründungen."""
    generation_request, questions = get_archive_questions(db, request_id)

    if not generation_request:
        raise HTTPException(status_code=404, detail="Archiv-Eintrag nicht gefunden.")

    if generation_request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Zugriff verweigert.")

    if not questions:
        raise HTTPException(status_code=422, detail="Keine Fragen in diesem Archiv-Eintrag.")

    questions_dicts = [
        {
            "stem": q.stem or "",
            "type": q.type or "",
            "difficulty": q.difficulty or "",
            "choices": q.choices,
            "correct_index": q.correct_index,
            "correct_indices": q.correct_indices,
            "answer": q.answer,
            "rationale": q.rationale,
        }
        for q in questions
    ]

    topic = generation_request.topic or "Fragen"
    pdf_bytes = build_questions_pdf_exam(questions=questions_dicts, topic=topic)

    safe_topic = topic.replace(" ", "_").replace("/", "-")
    filename = f"{safe_topic}_klausur.pdf"

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/archive/{request_id}/export/xml")
@router.get("/archive/{request_id}/export/moodle")
def export_archive_xml(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    generation_request, questions = get_archive_questions(db, request_id)

    if not generation_request:
        raise HTTPException(status_code=404, detail="Archiv-Eintrag nicht gefunden.")

    if generation_request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Zugriff verweigert.")

    if not questions:
        raise HTTPException(status_code=422, detail="Keine Fragen in diesem Archiv-Eintrag.")

    questions_dicts = [
        {
            "stem": q.stem or "",
            "type": q.type or "",
            "difficulty": q.difficulty or "",
            "choices": q.choices,
            "correct_index": q.correct_index,
            "correct_indices": q.correct_indices,
            "answer": q.answer,
            "rationale": q.rationale,
        }
        for q in questions
    ]

    topic = generation_request.topic or "Fragen"
    xml_str = build_moodle_xml(questions=questions_dicts, topic=topic)
    xml_bytes = xml_str.encode("utf-8")

    safe_topic = topic.replace(" ", "_").replace("/", "-")
    filename = f"{safe_topic}_moodle.xml"

    return StreamingResponse(
        iter([xml_bytes]),
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/archive/{request_id}/export/pptx")
def export_archive_pptx(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    # Versuchen, den GenerationRequest zu laden
    generation_request = db.query(GenerationRequest).filter(GenerationRequest.id == request_id).first()
    
    if not generation_request:
        # Fallback: Vielleicht ist request_id direkt eine SlideDeck ID?
        deck = db.query(SlideDeck).filter(SlideDeck.id == request_id).first()
        if not deck:
            raise HTTPException(status_code=404, detail="Archiv-Eintrag oder Folien-Deck nicht gefunden.")
        if deck.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Zugriff verweigert.")
        generation_request = deck.request_id # Kann None sein
    else:
        if generation_request.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Zugriff verweigert.")
        # SlideDeck für diesen GenerationRequest suchen
        deck = db.query(SlideDeck).filter(SlideDeck.request_id == request_id).first()

    if not deck:
        raise HTTPException(status_code=404, detail="Keine Folien für diesen Archiv-Eintrag gefunden.")

    slides_dicts = [
        {
            "position": s.position,
            "slide_type": s.slide_type or "content",
            "title": s.title or "",
            "bullets": s.bullets or [],
            "examples": s.examples or [],
        }
        for s in deck.slides
    ]

    topic = deck.name or (generation_request.topic if generation_request else "Folien")
    pptx_bytes = build_slides_pptx(slides=slides_dicts, topic=topic)

    safe_topic = topic.replace(" ", "_").replace("/", "-")
    filename = f"{safe_topic}_folien.pptx"

    return StreamingResponse(
        iter([pptx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

