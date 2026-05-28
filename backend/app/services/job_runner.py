from uuid import UUID

from ..db import SessionLocal
from ..persistence.job_repository import get_job, update_job
from ..models.generate_models import GenerateRequest
from ..models.slides_models import SlidesGenerateRequest
from .generation.orchestrator import generate_questions
from .generation.slides_orchestrator import generate_slides
from .batch_runner import run_question_batches, run_slide_batches, JobCancelledError

def ensure_job_not_cancelled(db, job_id: UUID) -> None:
    job = get_job(db, job_id)
    if job and job.status == "failed" and job.error_message == "Generierung wurde vom Nutzer abgebrochen.":
        raise JobCancelledError()

async def run_questions_job(
    job_id: UUID,
    request_data: dict,
    user_id: UUID,
) -> None:
    db = SessionLocal()
    try:
        ensure_job_not_cancelled(db, job_id)
        update_job(db, job_id, status="running", progress=0, stage_label="Wird gestartet")

        def on_progress(progress: int, stage_label: str) -> None:
            ensure_job_not_cancelled(db, job_id)
            update_job(db, job_id, progress=progress, stage_label=stage_label)

        #request_data ist ein Dict aus der DB — **request_data entpackt es als Keyword-Argumente für den Pydantic-Konstruktor
        req = GenerateRequest(**request_data)
        accumulated_questions, shared_request_id = await run_question_batches(
            job_id=job_id,
            req=req,
            user_id=user_id,
            db=db,
            on_progress=on_progress,
        )
        ensure_job_not_cancelled(db, job_id)

        update_job(
            db,
            job_id,
            status="completed",
            progress=100,
            stage_label="Abgeschlossen",
            result_data={
                "request_id": str(shared_request_id),
                "questions": accumulated_questions,
            },
        )

    except JobCancelledError:
        return
    except Exception as e:
        update_job(
            db,
            job_id,
            status="failed",
            error_message=str(e),
        )
    finally:
        db.close()

async def run_slides_job(
    job_id: UUID,
    request_data: dict,
    user_id: UUID,
) -> None:
    db = SessionLocal()
    try:
        ensure_job_not_cancelled(db, job_id)
        update_job(db, job_id, status="running", progress=0, stage_label="Wird gestartet")

        def on_progress(progress: int, stage_label: str) -> None:
            ensure_job_not_cancelled(db, job_id)
            update_job(db, job_id, progress=progress, stage_label=stage_label)

        req = SlidesGenerateRequest(**request_data)
        accumulated_slides, shared_request_id = await run_slide_batches(
            job_id=job_id,
            req=req,
            user_id=user_id,
            db=db,
            on_progress=on_progress,
        )
        ensure_job_not_cancelled(db, job_id)

        update_job(
            db,
            job_id,
            status="completed",
            progress=100,
            stage_label="Abgeschlossen",
            result_data={
                "request_id": str(shared_request_id),
                "slides": accumulated_slides,
            },
        )

    except JobCancelledError:
        return
    except Exception as e:
        update_job(
            db,
            job_id,
            status="failed",
            error_message=str(e),
        )
    finally:
        db.close()