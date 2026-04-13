import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .core.exceptions import (AppError)
from .api.routes_generate import router as generate_router
from .api.routes_archive import router as archive_router
from .api.routes_finalize import router as finalize_router
from .api.routes_authentification import router as auth_router
from .api.routes_upload import router as upload_router

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
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

@app.on_event("startup")
async def startup_check():
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY missing; LLM features disabled.")

@app.exception_handler(AppError)
async def handle_app_error(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.error_code,
            "detail": exc.detail,
        },
    )

@app.get("/health")
def health():
    return {"status": "ok", "message": "Backend läuft!"}

# --- API-Routen registrieren ---
app.include_router(generate_router, prefix="/api")
app.include_router(archive_router, prefix="/api")
app.include_router(finalize_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(upload_router, prefix="/api")