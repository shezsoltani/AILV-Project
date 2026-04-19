from fastapi import HTTPException, status
from ...core.exceptions import ContextTextTooLongError
from ...models.slides_models import SlidesGenerateRequest

ALLOWED_LANGUAGES = {"de", "en"}
MIN_TOPIC_LENGTH = 3
MAX_TOPIC_LENGTH = 200
MIN_SLIDE_COUNT = 5
MAX_SLIDE_COUNT = 30
MAX_CONTEXT_TEXT_LENGTH = 5000


class SlidesGenerateRequestValidator:

    def validate(self, req: SlidesGenerateRequest) -> None:
        # Thema prüfen
        topic = req.topic.strip()
        if len(topic) < MIN_TOPIC_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"topic muss mindestens {MIN_TOPIC_LENGTH} Zeichen enthalten (nach trim).",
            )
        if len(topic) > MAX_TOPIC_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"topic darf maximal {MAX_TOPIC_LENGTH} Zeichen enthalten (nach trim).",
            )

        # Anzahl prüfen
        if not (MIN_SLIDE_COUNT <= req.slide_count <= MAX_SLIDE_COUNT):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"slide_count muss zwischen {MIN_SLIDE_COUNT} und {MAX_SLIDE_COUNT} liegen.",
            )

        # 3) Sprache prüfen
        if req.language.value not in ALLOWED_LANGUAGES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Unbekannte Sprache: {req.language.value}. Erlaubt: {ALLOWED_LANGUAGES}",
            )

        # 4) Optionale Felder — None-safe
        if req.context_text is not None and len(req.context_text) > MAX_CONTEXT_TEXT_LENGTH:
            raise ContextTextTooLongError(
                max_length=MAX_CONTEXT_TEXT_LENGTH,
                actual_length=len(req.context_text),
            )

        if req.upload_context is not None and len(req.upload_context) > MAX_CONTEXT_TEXT_LENGTH:
            raise ContextTextTooLongError(
                max_length=MAX_CONTEXT_TEXT_LENGTH,
                actual_length=len(req.upload_context),
            )