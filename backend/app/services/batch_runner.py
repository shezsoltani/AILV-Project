from uuid import UUID
from sqlalchemy.orm import Session

from ..persistence.job_repository import update_job
from ..persistence.generation_repo import create_generation_request_db
from ..models.generate_models import GenerateRequest
from ..models.slides_models import SlidesGenerateRequest
from .generation.orchestrator import generate_questions
from .generation.slides_orchestrator import generate_slides

BATCH_SIZE = 10

def _compute_batches(total: int) -> list[int]:
    full = total // BATCH_SIZE
    remainder = total % BATCH_SIZE
    batches = [BATCH_SIZE] * full
    if remainder:
        batches.append(remainder)
    return batches

async def run_question_batches(
    job_id: UUID,
    req: GenerateRequest,
    user_id: UUID,
    db: Session,
    on_progress,
    start_batch: int = 1,
    accumulated_questions: list | None = None,
    existing_request_id: UUID | None = None,
) -> tuple[list, UUID]:
    if accumulated_questions is None:
        accumulated_questions = []

    batches = _compute_batches(req.count)
    n = len(batches)
    last_stage_label = "Initialisierung"

    if existing_request_id is None:
        db_req = create_generation_request_db(db, req, user_id)
        shared_request_id = db_req.id
    else:
        shared_request_id = existing_request_id

    for i, batch_size in enumerate(batches, start=1):
        #Für Retry: bereits abgeschlossene Batches überspringen
        if i < start_batch:
            continue

        update_job(
            db, job_id,
            batch_current=i,
            batch_total=n,
            progress=0,
        )

        try:
            def on_progress_wrapped(progress: int, stage_label: str) -> None:
                nonlocal last_stage_label
                last_stage_label = stage_label
                on_progress(progress, stage_label)

            #Pydantic-Modelle sind immutable — model_copy erstellt eine Kopie mit geändertem count
            batch_req = req.model_copy(update={"count": batch_size})
            response = await generate_questions(
                batch_req,
                db,
                user_id=user_id,
                on_progress=on_progress_wrapped,
                existing_request_id=shared_request_id,
            )

            accumulated_questions.extend(
                [q.model_dump(mode="json") for q in response.questions]
            )
            #model_dump(mode="json") wandelt Pydantic-Objekte in JSON-kompatible Dicts um

            update_job(
                db, job_id,
                result_data={
                    "request_id": str(shared_request_id),
                    "questions": accumulated_questions,
                },
            )

        except Exception as e:
            raise Exception(
                f"Batch {i} von {n} fehlgeschlagen (Schritt '{last_stage_label}'): {str(e)}"
            ) from e

    return accumulated_questions, shared_request_id

async def run_slide_batches(
    job_id: UUID,
    req: SlidesGenerateRequest,
    user_id: UUID,
    db: Session,
    on_progress,
    start_batch: int = 1,
    accumulated_slides: list | None = None,
    existing_request_id: UUID | None = None,
) -> tuple[list, UUID]:
    if accumulated_slides is None:
        accumulated_slides = []

    batches = _compute_batches(req.slide_count)
    n = len(batches)
    last_stage_label = "Initialisierung"

    if existing_request_id is None:
        from ..models.generate_models import GenerateRequest as GR
        base_req = GR(
            topic=req.topic,
            language=req.language,
            count=1,
            context_text=req.context_text,
            upload_context=req.upload_context,
        )
        db_req = create_generation_request_db(
            db, base_req, user_id=user_id,
            request_type="slides",
            slide_count=req.slide_count,
        )
        shared_request_id = db_req.id
    else:
        shared_request_id = existing_request_id

    for i, batch_size in enumerate(batches, start=1):
        if i < start_batch:
            continue

        update_job(
            db, job_id,
            batch_current=i,
            batch_total=n,
            progress=0,
        )

        try:
            def on_progress_wrapped(progress: int, stage_label: str) -> None:
                nonlocal last_stage_label
                last_stage_label = stage_label
                on_progress(progress, stage_label)

            batch_req = req.model_copy(update={"slide_count": batch_size})
            response = await generate_slides(
                batch_req,
                db,
                user_id=user_id,
                on_progress=on_progress_wrapped,
                existing_request_id=shared_request_id,
            )

            accumulated_slides.extend(
                [s.model_dump(mode="json") for s in response.slides]
            )

            update_job(
                db, job_id,
                result_data={
                    "request_id": str(shared_request_id),
                    "slides": accumulated_slides,
                },
            )

        except Exception as e:
            raise Exception(
                f"Batch {i} von {n} fehlgeschlagen (Schritt '{last_stage_label}'): {str(e)}"
            ) from e

    return accumulated_slides, shared_request_id