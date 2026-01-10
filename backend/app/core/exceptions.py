class PromptTemplateNotFound(Exception):
    def __init__(self, stage: str, language: str):
        super().__init__(f"No prompt template found for stage='{stage}', language='{language}'.")
        self.stage = stage
        self.language = language

class TemplateRenderError(Exception):
    def __init__(self, detail: str):
        super().__init__(f"Template rendering failed: {detail}")
        self.detail = detail

class LLMJSONError(Exception):
    def __init__(self, detail: str, raw: str | None = None):
        super().__init__(f"Invalid JSON from LLM: {detail}")
        self.detail = detail
        self.raw = raw

class SkeletonValidationError(Exception):
    def __init__(self, detail: str):
        super().__init__(f"Invalid skeleton structure: {detail}")
        self.detail = detail

class ContentValidationError(Exception):
    def __init__(self, detail: str):
        super().__init__(f"Invalid content structure: {detail}")
        self.detail = detail

class ImproveValidationError(Exception):
    def __init__(self, detail: str):
        super().__init__(f"Invalid improved content structure: {detail}")
        self.detail = detail

class LLMAPIError(Exception):
    def __init__(self, status_code: int | None, message: str, detail: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.detail = detail


class ArchiveNotFoundError(Exception):
    def __init__(self, request_id: str | None = None, detail: str | None = None):
        if request_id and detail:
            message = f"Archive not found for request_id='{request_id}': {detail}"
        elif request_id:
            message = f"Archive not found for request_id='{request_id}'"
        elif detail:
            message = f"Archive not found: {detail}"
        else:
            message = "Archive not found"
        super().__init__(message)
        self.request_id = request_id
        self.detail = detail


class ArchiveServiceError(Exception):
    def __init__(self, message: str, detail: str | None = None):
        super().__init__(f"Archive service error: {message}")
        self.message = message
        self.detail = detail

