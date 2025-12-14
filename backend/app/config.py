import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class Settings:
    """Zentrale Konfiguration für die Anwendung."""
    
    openai_api_key: Optional[str]
    openai_model_name: str
    
    @classmethod
    def from_env(cls) -> "Settings":
        """Liest Konfiguration aus Environment-Variablen."""
        # OPENAI_API_KEY: trim whitespace, None wenn leer oder nicht gesetzt
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        openai_api_key = api_key if api_key else None
        
        # OPENAI_MODEL_NAME: trim whitespace, Default "gpt-4o" wenn leer oder nicht gesetzt
        model_name = os.getenv("OPENAI_MODEL_NAME", "").strip()
        openai_model_name = model_name if model_name else "gpt-4o"
        
        return cls(
            openai_api_key=openai_api_key,
            openai_model_name=openai_model_name
        )


# Zentrale Settings-Instanz, importierbar via: from app.config import settings
settings = Settings.from_env()

