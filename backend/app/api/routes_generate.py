from fastapi import APIRouter
from ..models.generate_models import GenerateRequest, GenerateResponse
from ..services.generator_service import generate_test_data

router = APIRouter()

@router.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    """
    Nimmt Eingabeparameter entgegen und gibt Testdaten zurück.
    (LLM-Integration folgt später)
    """
    result = generate_test_data(req)
    return result
