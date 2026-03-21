from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr

from ..config import settings

conf = ConnectionConfig(
    MAIL_USERNAME=settings.smtp_user,
    MAIL_PASSWORD=settings.smtp_password,
    MAIL_FROM=settings.mail_from,
    MAIL_PORT=settings.smtp_port,
    MAIL_SERVER=settings.smtp_host,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
)

async def send_reset_email(to: EmailStr, token: str):
    reset_link = f"http://localhost:3000/reset-password?token={token}"

    message = MessageSchema(
        subject="Password Reset",
        recipients=[to],
        body=f"""
        Click the link to reset your password:
        {reset_link}

        This link expires soon.
        """,
        subtype="plain",
    )

    fm = FastMail(conf)
    await fm.send_message(message)