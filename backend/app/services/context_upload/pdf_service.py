import re
import pymupdf
from ...core.exceptions import PDFEncryptedError, PDFExtractionError

MAX_EXTRACTED_TEXT_LENGTH = 5000


def _normalize_extracted_text(text: str) -> str:
    # PDF extraction can introduce many layout line breaks/spaces.
    # We normalize whitespace so the 5000-char limit reflects content better.
    return re.sub(r"\s+", " ", text).strip()


def extract_text_from_pdf(data: bytes, filename: str = "upload.pdf") -> tuple[str, bool]:
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

    text = _normalize_extracted_text(text)
    was_truncated = len(text) > MAX_EXTRACTED_TEXT_LENGTH
    if was_truncated:
        text = text[:MAX_EXTRACTED_TEXT_LENGTH]

    return text, was_truncated