import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class Settings:
    """Zentrale Konfiguration für die Anwendung."""
    
    openai_api_key: Optional[str]
    openai_model_name: str

    jwt_secret_key: str
    jwt_algorithm: str

    @classmethod
    def from_env(cls) -> "Settings":
        """Liest Konfiguration aus Environment-Variablen."""
        # OPENAI_API_KEY
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        openai_api_key = api_key if api_key else None
        
        # OPENAI_MODEL_NAME
        model_name = os.getenv("OPENAI_MODEL_NAME", "").strip()
        openai_model_name = model_name if model_name else "gpt-4o"

        # JWT
        jwt_secret_key = os.getenv("JWT_SECRET_KEY", "")
        if not jwt_secret_key:
            raise RuntimeError("JWT_SECRET_KEY environment variable not set")

        jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")

        return cls(
            openai_api_key=openai_api_key,
            openai_model_name=openai_model_name,
            jwt_secret_key=jwt_secret_key,
            jwt_algorithm=jwt_algorithm
        )

# Zentrale Settings-Instanz, importierbar via: from app.config import settings
settings = Settings.from_env()

