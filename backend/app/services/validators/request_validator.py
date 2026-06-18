from fastapi import HTTPException, status
from ...core.exceptions import ContextTextTooLongError
from ...models.generate_models import GenerateRequest
from .custom_prompt_validator import validate_custom_prompts_dict

ALLOWED_TYPES = {"SCQ", "MCQ", "SHORT_ANSWER", "TRUE_FALSE"}
ALLOWED_DIFFICULTIES = {"easy", "medium", "hard"}
MAX_CONTEXT_TEXT_LENGTH = 5000

class GenerateRequestValidator:

    def validate(self, req: GenerateRequest) -> None:
        # 1) Typen erlauben only
        if not req.types:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="types muss mindestens einen Fragetyp enthalten.",
            )

        for t in req.types:
            if t not in ALLOWED_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Unerlaubter Fragetyp: {t}",
                )

        # 2) Difficulty keys und Summe prüfen
        keys = set(req.difficulty_distribution.keys())
        if not keys <= ALLOWED_DIFFICULTIES:
            extra = keys - ALLOWED_DIFFICULTIES
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unbekannte difficulty keys: {sorted(list(extra))}",
            )

        total = sum(int(v) for v in req.difficulty_distribution.values())
        if total != 100:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"difficulty_distribution muss insgesamt 100 ergeben (aktuell {total}).",
            )

        if req.context_text and len(req.context_text) > MAX_CONTEXT_TEXT_LENGTH:
            raise ContextTextTooLongError(
                max_length=MAX_CONTEXT_TEXT_LENGTH,
                actual_length=len(req.context_text),
            )

        if req.custom_prompts:
            validate_custom_prompts_dict(req.custom_prompts)


