from uuid import UUID

from ..db import SessionLocal
from ..persistence.job_repository import update_job
from ..models.generate_models import GenerateRequest
from ..models.slides_models import SlidesGenerateRequest
from .generation.orchestrator import generate_questions
from .generation.slides_orchestrator import generate_slides

async def run_questions_job(
    job_id: UUID,
    request_data: dict,
    user_id: UUID,
) -> None:
    db = SessionLocal()
    try:
        update_job(db, job_id, status="running", progress=0, stage_label="Wird gestartet")

        def on_progress(progress: int, stage_label: str) -> None:
            update_job(db, job_id, progress=progress, stage_label=stage_label)

        req = GenerateRequest(**request_data)
        response = await generate_questions(req, db, user_id=user_id, on_progress=on_progress)

        update_job(
            db,
            job_id,
            status="completed",
            progress=100,
            stage_label="Abgeschlossen",
            result_data=response.model_dump(mode="json"),
        )

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
        update_job(db, job_id, status="running", progress=0, stage_label="Wird gestartet")

        def on_progress(progress: int, stage_label: str) -> None:
            update_job(db, job_id, progress=progress, stage_label=stage_label)

        req = SlidesGenerateRequest(**request_data)
        response = await generate_slides(req, db, user_id=user_id, on_progress=on_progress)

        update_job(
            db,
            job_id,
            status="completed",
            progress=100,
            stage_label="Abgeschlossen",
            result_data=response.model_dump(mode="json"),
        )

    except Exception as e:
        update_job(
            db,
            job_id,
            status="failed",
            error_message=str(e),
        )
    finally:
        db.close()