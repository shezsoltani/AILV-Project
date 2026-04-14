from fastapi import APIRouter, Depends, UploadFile, File, HTTPException

from ..models.upload_models import PDFUploadResponse
from ..services.context_upload.pdf_service import extract_text_from_pdf
from ..core.exceptions import PDFEncryptedError, PDFExtractionError,  UploadInvalidTypeError, UploadFileTooLargeError
from ..core.auth_utils import get_current_user
from ..models.sql_models import User

router = APIRouter(prefix="/upload", tags=["upload"])

MAX_PDF_SIZE_MB = 5
MAX_PDF_SIZE = MAX_PDF_SIZE_MB * 1024 * 1024
PDF_MAGIC_BYTES = b"%PDF"

@router.post("/pdf", response_model=PDFUploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    data = await file.read()

    if not data.startswith(PDF_MAGIC_BYTES):
        raise UploadInvalidTypeError()

    if len(data) > MAX_PDF_SIZE:
        raise UploadFileTooLargeError(MAX_PDF_SIZE_MB)

    text, was_truncated = extract_text_from_pdf(data, filename=file.filename or "upload.pdf")

    return PDFUploadResponse(
        filename=file.filename or "upload.pdf",
        char_count=len(text),
        extracted_text=text,
        was_truncated=was_truncated,
    )
