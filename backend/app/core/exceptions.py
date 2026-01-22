class AppError(Exception):
    status_code: int = 500
    error_code: str = "app_error"

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail

class PromptTemplateNotFound(AppError):
    status_code = 500
    error_code = "prompt_template_not_found"

    def __init__(self, stage: str, language: str):
        super().__init__(
            f"No prompt template found for stage='{stage}', language='{language}'."
        )
        self.stage = stage
        self.language = language


class TemplateRenderError(AppError):
    status_code = 422
    error_code = "template_render_error"

    def __init__(self, detail: str):
        super().__init__(detail)


class LLMJSONError(AppError):
    status_code = 422
    error_code = "llm_invalid_json"

    def __init__(self, detail: str, raw: str | None = None):
        super().__init__(detail)
        self.raw = raw


class SkeletonValidationError(AppError):
    status_code = 422
    error_code = "invalid_skeleton"

    def __init__(self, detail: str):
        super().__init__(detail)


class ContentValidationError(AppError):
    status_code = 422
    error_code = "invalid_content"

    def __init__(self, detail: str):
        super().__init__(detail)


class ImproveValidationError(AppError):
    status_code = 422
    error_code = "invalid_improved_content"

    def __init__(self, detail: str):
        super().__init__(detail)


class PromptStateError(AppError):
    status_code = 500
    error_code = "prompt_state_error"


class FinalizeStateError(AppError):
    status_code = 409
    error_code = "finalize_state_error"

    def __init__(self, detail: str):
        super().__init__(detail)


class LLMAPIError(AppError):
    status_code = 502
    error_code = "llm_api_error"

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        detail: str | None = None,
    ):
        super().__init__(detail or message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code


class ArchiveNotFoundError(AppError):
    status_code = 404
    error_code = "archive_not_found"

    def __init__(self, request_id: str | None = None, detail: str | None = None):
        if request_id and detail:
            msg = f"Archive not found for request_id='{request_id}': {detail}"
        elif request_id:
            msg = f"Archive not found for request_id='{request_id}'"
        elif detail:
            msg = f"Archive not found: {detail}"
        else:
            msg = "Archive not found"

        super().__init__(msg)
        self.request_id = request_id


class ArchiveServiceError(AppError):
    status_code = 500
    error_code = "archive_service_error"

    def __init__(self, message: str, detail: str | None = None):
        super().__init__(detail or message)
        self.message = message

