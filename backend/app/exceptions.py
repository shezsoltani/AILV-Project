class PromptTemplateNotFound(Exception):
    def __init__(self, stage: str, language: str):
        super().__init__(f"No prompt template found for stage='{stage}', language='{language}'.")
        self.stage = stage
        self.language = language

# backend/core/exceptions.py

class TemplateRenderError(Exception):
    def __init__(self, detail: str):
        super().__init__(f"Template rendering failed: {detail}")
        self.detail = detail
