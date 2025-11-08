import random
from ..models.generate_models import GenerateRequest, GenerateResponse, GeneratedQuestion


def generate_test_data(req: GenerateRequest) -> GenerateResponse:
    """
    Erzeugt Dummy-Fragen, um den Endpunkt zu testen.
    """
    difficulties = list(req.difficulty_distribution.keys())
    questions = []

    for i in range(req.count):
        q_type = random.choice(req.types)
        diff = random.choice(difficulties)
        q_text = f"Beispiel-Frage {i+1} zu '{req.topic}' ({q_type}, {diff})"
        questions.append(GeneratedQuestion(question=q_text, type=q_type, difficulty=diff))

    return GenerateResponse(
        accepted=True,
        topic=req.topic,
        language=req.language,
        count=req.count,
        questions=questions
    )
