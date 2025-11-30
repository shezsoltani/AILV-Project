from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from .exceptions import TemplateRenderError, PromptTemplateNotFound
from .api.routes_generate import router as generate_router

app = FastAPI(
    title="AI-LV Backend",
    version="0.1",
    description="Backend-Service für die AI-LV Projektarchitektur"
)

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

@app.get("/health")
def health():
    return {"status": "ok", "message": "Backend läuft!"}

# --- API-Routen registrieren ---
app.include_router(generate_router, prefix="/api")
