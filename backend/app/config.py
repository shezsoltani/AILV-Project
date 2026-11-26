import os
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class Settings:
    """Zentrale Konfiguration für die Anwendung."""
    
    openai_api_key: Optional[str]
    openai_model_name: str

    jwt_secret_key: str
    jwt_algorithm: str

    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    mail_from: str

    allowed_origins: list[str]

    enable_docs: bool

    ollama_enabled: bool = False
    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_models: tuple[str, ...] = ("qwen3:8b",)
    ollama_timeout_seconds: float = 120.0

    frontend_base_url: str = "http://localhost:3000"

    rate_limit_window_seconds: int = 900
    login_rate_limit_per_user: int = 5
    login_rate_limit_per_ip: int = 50
    forgot_password_rate_limit_per_email: int = 3
    forgot_password_rate_limit_per_ip: int = 10
    reset_password_rate_limit_per_ip: int = 10
    trust_proxy_headers: bool = False

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

        # SMTP (E-Mails)
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        mail_from = os.getenv("MAIL_FROM")

        if not all([smtp_host, smtp_user, smtp_password, mail_from]):
            raise RuntimeError("SMTP configuration incomplete")

        # ALLOWED_ORIGINS
        raw_origins = os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://localhost:5173"
        )
        allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

        # FRONTEND_BASE_URL (öffentliche Adresse des Frontends, z. B. für Links in E-Mails)
        frontend_base_url = (
            os.getenv("FRONTEND_BASE_URL", "").strip().rstrip("/")
            or "http://localhost:3000"
        )

        # ENABLE_DOCS
        enable_docs = os.getenv("ENABLE_DOCS", "false").strip().lower() == "true"

        return cls(
            openai_api_key=openai_api_key,
            openai_model_name=openai_model_name,
            jwt_secret_key=jwt_secret_key,
            jwt_algorithm=jwt_algorithm,
            smtp_host=smtp_host,
            smtp_port=smtp_port,
            smtp_user=smtp_user,
            smtp_password=smtp_password,
            mail_from=mail_from,
            allowed_origins=allowed_origins,
            enable_docs=enable_docs,
            frontend_base_url=frontend_base_url,
            rate_limit_window_seconds=int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "900")),
            login_rate_limit_per_user=int(os.getenv("LOGIN_RATE_LIMIT_PER_USER", "5")),
            login_rate_limit_per_ip=int(os.getenv("LOGIN_RATE_LIMIT_PER_IP", "50")),
            forgot_password_rate_limit_per_email=int(os.getenv("FORGOT_PASSWORD_RATE_LIMIT_PER_EMAIL", "3")),
            forgot_password_rate_limit_per_ip=int(os.getenv("FORGOT_PASSWORD_RATE_LIMIT_PER_IP", "10")),
            reset_password_rate_limit_per_ip=int(os.getenv("RESET_PASSWORD_RATE_LIMIT_PER_IP", "10")),
            trust_proxy_headers=os.getenv("TRUST_PROXY_HEADERS", "false").strip().lower() == "true",
            ollama_enabled=os.getenv("OLLAMA_ENABLED", "false").lower() == "true",
            ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434").rstrip("/"),
            ollama_models=tuple(m.strip() for m in os.getenv("OLLAMA_MODELS", "qwen3:8b").split(",") if m.strip()),
            ollama_timeout_seconds=float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "120")),
        )

# Zentrale Settings-Instanz, importierbar via: from app.config import settings
settings = Settings.from_env()

