from uuid import UUID
from sqlalchemy.orm import Session

from ..persistence.job_repository import update_job
from ..persistence.generation_repo import create_generation_request_db
from ..models.generate_models import GenerateRequest
from ..models.slides_models import SlidesGenerateRequest
from .generation.orchestrator import generate_questions
from .generation.slides_orchestrator import generate_slides

BATCH_SIZE = 10
BATCH_RETRY_MAX = 3


class JobCancelledError(Exception):
    pass


# Verhindert, dass ein Custom Prompt mit fest eingebautem count bei Mehrfach-Batches falsche Mengen vorgibt.
def _custom_prompts_for_batch(
    custom_prompts: dict[str, str] | None,
    *,
    batch_total: int,
    stage: str,
    count_placeholder: str,
) -> dict[str, str] | None:
    """Entfernt count-gebundene Custom Prompts ohne Platzhalter bei Mehrfach-Batches."""
    if not custom_prompts or batch_total <= 1:
        return custom_prompts

    prompt = custom_prompts.get(stage)
    if prompt is None or count_placeholder in prompt:
        return custom_prompts

    resolved = dict(custom_prompts)
    del resolved[stage]
    return resolved


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
    # Einmalig vor der Batch-Schleife berechnen, damit alle Batches dieselbe bereinigte Prompt-Map nutzen.
    batch_custom_prompts = _custom_prompts_for_batch(
        req.custom_prompts,
        batch_total=n,
        stage="SKELETON",
        count_placeholder="{{count}}",
    )

    # Außerhalb der Retry-Schleife definiert, damit last_stage_label korrekt per nonlocal aktualisiert wird.
    def on_progress_wrapped(progress: int, stage_label: str) -> None:
        nonlocal last_stage_label
        last_stage_label = stage_label
        on_progress(progress, stage_label)

    if existing_request_id is None:
        db_req = create_generation_request_db(db, req, user_id)
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

        last_error = None

        for attempt in range(1, BATCH_RETRY_MAX + 1):
            try:
                batch_req = req.model_copy(update={"count": batch_size})
                response = await generate_questions(
                    batch_req,
                    db,
                    user_id=user_id,
                    on_progress=on_progress_wrapped,
                    existing_request_id=shared_request_id,
                    custom_prompts=batch_custom_prompts,
                )

                accumulated_questions.extend(
                    [q.model_dump(mode="json") for q in response.questions]
                )

                update_job(
                    db, job_id,
                    batch_retrying=False,
                    result_data={
                        "request_id": str(shared_request_id),
                        "questions": accumulated_questions,
                    },
                )

                last_error = None
                break  # Batch erfolgreich — nächster Batch

            # Abbruch durch den Nutzer sofort nach oben durchreichen, kein Retry.
            except JobCancelledError:
                raise
            except Exception as e:
                last_error = e

                if attempt < BATCH_RETRY_MAX:
                    update_job(
                        db, job_id,
                        batch_retrying=True,
                        progress=0,
                        stage_label=(
                            f"Batch {i} von {n} fehlgeschlagen – wird erneut generiert "
                            f"(Versuch {attempt} von {BATCH_RETRY_MAX})"
                        ),
                    )

        if last_error is not None:
            raise Exception(
                f"Batch {i} von {n} konnte nach {BATCH_RETRY_MAX} Versuchen nicht "
                f"abgeschlossen werden (Schritt '{last_stage_label}'): {str(last_error)}"
            ) from last_error

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
    # Einmalig vor der Batch-Schleife berechnen, damit alle Batches dieselbe bereinigte Prompt-Map nutzen.
    batch_custom_prompts = _custom_prompts_for_batch(
        req.custom_prompts,
        batch_total=n,
        stage="SLIDES_OUTLINE",
        count_placeholder="{{slide_count}}",
    )

    # Außerhalb der Retry-Schleife definiert, damit last_stage_label korrekt per nonlocal aktualisiert wird.
    def on_progress_wrapped(progress: int, stage_label: str) -> None:
        nonlocal last_stage_label
        last_stage_label = stage_label
        on_progress(progress, stage_label)

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

        last_error = None

        for attempt in range(1, BATCH_RETRY_MAX + 1):
            try:
                batch_req = req.model_copy(update={"slide_count": batch_size})
                response = await generate_slides(
                    batch_req,
                    db,
                    user_id=user_id,
                    on_progress=on_progress_wrapped,
                    existing_request_id=shared_request_id,
                    custom_prompts=batch_custom_prompts,
                )

                accumulated_slides.extend(
                    [s.model_dump(mode="json") for s in response.slides]
                )

                update_job(
                    db, job_id,
                    batch_retrying=False,
                    result_data={
                        "request_id": str(shared_request_id),
                        "slides": accumulated_slides,
                    },
                )

                last_error = None
                break  # Batch erfolgreich — nächster Batch

            # Abbruch durch den Nutzer sofort nach oben durchreichen, kein Retry.
            except JobCancelledError:
                raise
            except Exception as e:
                last_error = e

                if attempt < BATCH_RETRY_MAX:
                    update_job(
                        db, job_id,
                        batch_retrying=True,
                        progress=0,
                        stage_label=(
                            f"Batch {i} von {n} fehlgeschlagen – wird erneut generiert "
                            f"(Versuch {attempt} von {BATCH_RETRY_MAX})"
                        ),
                    )

        if last_error is not None:
            raise Exception(
                f"Batch {i} von {n} konnte nach {BATCH_RETRY_MAX} Versuchen nicht "
                f"abgeschlossen werden (Schritt '{last_stage_label}'): {str(last_error)}"
            ) from last_error

    return accumulated_slides, shared_request_id
