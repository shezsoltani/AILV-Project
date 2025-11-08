from fastapi import FastAPI
from .api.routes_generate import router as generate_router


app = FastAPI(
    title="AI-LV Backend",
    version="0.1",
    description="Backend-Service für die AI-LV Projektarchitektur"
)

@app.get("/health")
def health():
    return {"status": "ok", "message": "Backend läuft!"}

# --- API-Routen registrieren ---
app.include_router(generate_router, prefix="/api")
