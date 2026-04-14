from fastapi import HTTPException, status
from ...core.exceptions import ContextTextTooLongError
from ...models.generate_models import GenerateRequest

ALLOWED_TYPES = {"MCQ", "SHORT_ANSWER", "TRUE_FALSE"}
ALLOWED_DIFFICULTIES = {"easy", "medium", "hard"}
MAX_CONTEXT_TEXT_LENGTH = 5000
# ALLOWED_BLOOM = {"Erinnern", "Verstehen", "Anwenden", "Analysieren", "Evaluieren", "Erstellen"}

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

        if len(req.context_text) > MAX_CONTEXT_TEXT_LENGTH:
            raise ContextTextTooLongError(
                max_length=MAX_CONTEXT_TEXT_LENGTH,
                actual_length=len(req.context_text),
            )

        # 3) Bloom-level validieren
        #if req.bloom_level and req.bloom_level not in ALLOWED_BLOOM:
        #    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        #                        detail=f"Ungültiger bloom_level. Erlaubt: {sorted(list(ALLOWED_BLOOM))}")

