from fastapi import APIRouter, Depends
from ..models.generate_models import GenerateRequest, GenerateResponse
from ..services.generator_service import generate_test_data
from ..services.validators import GenerateRequestValidator

router = APIRouter()

def get_validator():
    return GenerateRequestValidator()

@router.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest, validator: GenerateRequestValidator = Depends(get_validator)):
    validator.validate(req)

    # Falls OK: Business-Logik aufrufen (Stub)
    result = generate_test_data(req)
    return result
