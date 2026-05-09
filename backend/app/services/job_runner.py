from uuid import UUID

from ..db import SessionLocal
from ..persistence.job_repository import get_job, update_job
from ..models.generate_models import GenerateRequest
from ..models.slides_models import SlidesGenerateRequest
from .generation.orchestrator import generate_questions
from .generation.slides_orchestrator import generate_slides

class JobCancelledError(Exception):
    pass

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
    last_stage_label = "Initialisierung"
    try:
        ensure_job_not_cancelled(db, job_id)
        update_job(db, job_id, status="running", progress=0, stage_label="Wird gestartet")

        def on_progress(progress: int, stage_label: str) -> None:
            nonlocal last_stage_label
            last_stage_label = stage_label
            ensure_job_not_cancelled(db, job_id)
            update_job(db, job_id, progress=progress, stage_label=stage_label)

        req = GenerateRequest(**request_data)
        response = await generate_questions(req, db, user_id=user_id, on_progress=on_progress)
        ensure_job_not_cancelled(db, job_id)

        update_job(
            db,
            job_id,
            status="completed",
            progress=100,
            stage_label="Abgeschlossen",
            result_data=response.model_dump(mode="json"),
        )

    except JobCancelledError:
        return
    except Exception as e:
        update_job(
            db,
            job_id,
            status="failed",
            error_message=f"Schritt '{last_stage_label}' fehlgeschlagen: {str(e)}",
        )
    finally:
        db.close()


async def run_slides_job(
    job_id: UUID,
    request_data: dict,
    user_id: UUID,
) -> None:
    db = SessionLocal()
    last_stage_label = "Initialisierung"
    try:
        ensure_job_not_cancelled(db, job_id)
        update_job(db, job_id, status="running", progress=0, stage_label="Wird gestartet")

        def on_progress(progress: int, stage_label: str) -> None:
            nonlocal last_stage_label
            last_stage_label = stage_label
            ensure_job_not_cancelled(db, job_id)
            update_job(db, job_id, progress=progress, stage_label=stage_label)

        req = SlidesGenerateRequest(**request_data)
        response = await generate_slides(req, db, user_id=user_id, on_progress=on_progress)
        ensure_job_not_cancelled(db, job_id)

        update_job(
            db,
            job_id,
            status="completed",
            progress=100,
            stage_label="Abgeschlossen",
            result_data=response.model_dump(mode="json"),
        )

    except JobCancelledError:
        return
    except Exception as e:
        update_job(
            db,
            job_id,
            status="failed",
            error_message=f"Schritt '{last_stage_label}' fehlgeschlagen: {str(e)}",
        )
    finally:
        db.close()