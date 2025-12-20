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


