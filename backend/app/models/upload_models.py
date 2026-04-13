from pydantic import BaseModel

class PDFUploadResponse(BaseModel):
    filename: str
    char_count: int
    extracted_text: str