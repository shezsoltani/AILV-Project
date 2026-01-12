import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .core.exceptions import (
    TemplateRenderError,
    PromptTemplateNotFound, 
    LLMJSONError, 
    SkeletonValidationError, 
    LLMAPIError,
    ImproveValidationError,
    ContentValidationError,
    ArchiveNotFoundError,
    ArchiveServiceError)
from .api.routes_generate import router as generate_router
from .api.routes_archive import router as archive_router

logger = logging.getLogger(__name__)

ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Vite Dev-Server im Docker-Compose
    "http://localhost:5173",  # optional: lokaler Vite-Dev-Server ohne Docker
]

app = FastAPI(
    title="AI-LV Backend",
    version="0.1",
    description="Backend-Service für die AI-LV Projektarchitektur"
)

# CORS-Konfiguration: erlaubt Aufrufe vom Vite-Frontend auf Port 3000/5173

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

@app.on_event("startup")
async def startup_check():
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY missing; LLM features disabled.")

@app.exception_handler(PromptTemplateNotFound)
async def template_not_found_handler(request: Request, exc: PromptTemplateNotFound):
    return JSONResponse(
        status_code=500,
        content={"error": "prompt_template_not_found", "detail": str(exc)}
    )

@app.exception_handler(TemplateRenderError)
async def handle_template_render_error(request: Request, exc: TemplateRenderError):
    return JSONResponse(
        status_code=422,
        content={"error": "template_render_error", "detail": str(exc)}
    )

@app.exception_handler(LLMJSONError)
async def handle_llm_json_error(request: Request, exc: LLMJSONError):
    return JSONResponse(
        status_code=422,
        content={"error": "llm_invalid_json", "detail": str(exc)}
    )

@app.exception_handler(SkeletonValidationError)
async def handle_skeleton_validation_error(request: Request, exc: SkeletonValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": "invalid_skeleton", "detail": str(exc)}
    )

@app.exception_handler(ContentValidationError)
async def handle_content_validation_error(request: Request, exc: ContentValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": "invalid_content", "detail": str(exc)}
    )

@app.exception_handler(ImproveValidationError)
async def handle_improve_validation_error(request: Request, exc: ImproveValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": "invalid_improved_content", "detail": str(exc)}
    )

@app.exception_handler(LLMAPIError)
async def handle_llm_api_error(request: Request, exc: LLMAPIError):
    return JSONResponse(
        status_code=502,
        content={"error": "llm_api_error", "detail": exc.message}
    )

@app.exception_handler(ArchiveNotFoundError)
async def handle_archive_not_found_error(request: Request, exc: ArchiveNotFoundError):
    return JSONResponse(
        status_code=404,
        content={"error": "archive_not_found", "detail": str(exc)}
    )

@app.exception_handler(ArchiveServiceError)
async def handle_archive_service_error(request: Request, exc: ArchiveServiceError):
    return JSONResponse(
        status_code=500,
        content={"error": "archive_service_error", "detail": str(exc)}
    )

@app.get("/health")
def health():
    return {"status": "ok", "message": "Backend läuft!"}

# --- API-Routen registrieren ---
app.include_router(generate_router, prefix="/api")
app.include_router(archive_router, prefix="/api")