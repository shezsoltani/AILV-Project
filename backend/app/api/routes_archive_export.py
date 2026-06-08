# backend/app/api/routes_archive_export.py
# Export-Endpunkte für archivierte Fragen (PDF, später XML und PPTX)

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..core.auth_utils import get_current_user
from ..db import get_db
from ..models.sql_models import User
from ..persistence.archive_repo import get_archive_questions
from ..services.pdf_export_service import build_questions_pdf

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
            "question": q.stem or "",
            "type": q.type or "",
            "difficulty": q.difficulty or "",
            "choices": q.choices,
            "correct_index": q.correct_index,
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
