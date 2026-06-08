from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..core.auth_utils import get_current_user
from ..db import get_db
from ..models.sql_models import User
from ..persistence.generation_repo import get_generation_request
from ..persistence.job_repository import get_job
from ..services.moodle_export_service import build_moodle_xml
from ..services.pdf_export_service import build_questions_pdf
from ..services.pptx_export_service import build_slides_pptx

router = APIRouter(prefix="/jobs")


@router.get("/{job_id}/export/pdf")
def export_questions_pdf(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    job = get_job(db, job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job nicht gefunden.")

    if job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Zugriff verweigert.")

    if job.status != "completed":
        raise HTTPException(status_code=422, detail="Job ist noch nicht abgeschlossen.")

    result_data: dict = job.result_data or {}
    questions: list[dict] = result_data.get("questions", [])

    # result_data["request_id"] wird als String gespeichert → UUID-Konvertierung nötig
    raw_request_id = result_data.get("request_id")
    if not raw_request_id:
        raise HTTPException(status_code=500, detail="Keine request_id im Job gefunden.")

    generation_request = get_generation_request(db, UUID(raw_request_id))
    if not generation_request:
        raise HTTPException(status_code=500, detail="Generierungs-Request nicht gefunden.")

    topic: str = generation_request.topic or "Fragen"

    pdf_bytes = build_questions_pdf(questions=questions, topic=topic)

    safe_topic = topic.replace(" ", "_").replace("/", "-")
    filename = f"{safe_topic}_fragen.pdf"

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{job_id}/export/pptx")
def export_slides_pptx(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    job = get_job(db, job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job nicht gefunden.")

    if job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Zugriff verweigert.")

    if job.status != "completed":
        raise HTTPException(status_code=422, detail="Job ist noch nicht abgeschlossen.")

    if job.job_type != "slides":
        raise HTTPException(status_code=422, detail="Dieser Job enthält keine Folien.")

    result_data: dict = job.result_data or {}
    slides: list[dict] = result_data.get("slides", [])

    # result_data["request_id"] wird als String gespeichert → UUID-Konvertierung nötig
    raw_request_id = result_data.get("request_id")
    if not raw_request_id:
        raise HTTPException(status_code=500, detail="Keine request_id im Job gefunden.")

    generation_request = get_generation_request(db, UUID(raw_request_id))
    if not generation_request:
        raise HTTPException(status_code=500, detail="Generierungs-Request nicht gefunden.")

    topic: str = generation_request.topic or "Folien"

    pptx_bytes = build_slides_pptx(slides=slides, topic=topic)

    safe_topic = topic.replace(" ", "_").replace("/", "-")
    filename = f"{safe_topic}_folien.pptx"

    return StreamingResponse(
        iter([pptx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{job_id}/export/moodle")
def export_questions_moodle(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    job = get_job(db, job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job nicht gefunden.")

    if job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Zugriff verweigert.")

    if job.status != "completed":
        raise HTTPException(status_code=422, detail="Job ist noch nicht abgeschlossen.")

    result_data: dict = job.result_data or {}
    questions: list[dict] = result_data.get("questions", [])

    # result_data["request_id"] wird als String gespeichert → UUID-Konvertierung nötig
    raw_request_id = result_data.get("request_id")
    if not raw_request_id:
        raise HTTPException(status_code=500, detail="Keine request_id im Job gefunden.")

    generation_request = get_generation_request(db, UUID(raw_request_id))
    if not generation_request:
        raise HTTPException(status_code=500, detail="Generierungs-Request nicht gefunden.")

    topic: str = generation_request.topic or "Fragen"

    xml_str = build_moodle_xml(questions=questions, topic=topic)
    xml_bytes = xml_str.encode("utf-8")

    safe_topic = topic.replace(" ", "_").replace("/", "-")
    filename = f"{safe_topic}_moodle.xml"

    return StreamingResponse(
        iter([xml_bytes]),
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
