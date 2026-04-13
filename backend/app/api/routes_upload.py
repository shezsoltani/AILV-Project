from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from ..models.upload_models import PDFUploadResponse
from ..services.pdf_service import extract_text_from_pdf
from ..core.exceptions import PDFEncryptedError, PDFExtractionError
from ..core.auth_utils import get_current_user
from ..models.sql_models import User

router = APIRouter(prefix="/upload", tags=["upload"])

MAX_PDF_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("/pdf", response_model=PDFUploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Only PDF files are accepted.")

    data = await file.read()

    if len(data) > MAX_PDF_SIZE:
        raise HTTPException(status_code=413, detail="PDF exceeds the 10 MB size limit.")

    try:
        text = extract_text_from_pdf(data, filename=file.filename or "upload.pdf")
    except (PDFEncryptedError, PDFExtractionError) as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    return PDFUploadResponse(
        filename=file.filename or "upload.pdf",
        char_count=len(text),
        extracted_text=text,
    )