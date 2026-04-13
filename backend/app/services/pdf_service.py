import pymupdf
from ..core.exceptions import PDFEncryptedError, PDFExtractionError


def extract_text_from_pdf(data: bytes, filename: str = "upload.pdf") -> str:
    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception as e:
        raise PDFExtractionError(f"Could not open PDF '{filename}': {e}")

    if doc.is_encrypted:
        raise PDFEncryptedError()

    try:
        text = "\n".join(page.get_text() for page in doc)
    except Exception as e:
        raise PDFExtractionError(f"Text extraction failed for '{filename}': {e}")
    finally:
        doc.close()

    return text