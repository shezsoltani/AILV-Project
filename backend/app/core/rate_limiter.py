# Begrenzt Login- und Reset-Versuche innerhalb eines Zeitfensters.
# Die Zähler liegen im Speicher, gelten also pro Worker und sind nach einem Neustart leer.
import math
import threading
import time

from fastapi import HTTPException, Request, status

from ..config import settings

clock = time.monotonic
_attempts: dict[tuple, list[float]] = {}
_lock = threading.Lock()


def _client_ip(request: Request) -> str:
    # X-Real-IP kommt von nginx. Ohne Proxy könnte man den Header fälschen.
    if settings.trust_proxy_headers and "x-real-ip" in request.headers:
        return request.headers["x-real-ip"]
    return request.client.host


def _remove_expired(oldest_allowed: float) -> None:
    for key in list(_attempts):
        _attempts[key] = [t for t in _attempts[key] if t > oldest_allowed]
        if not _attempts[key]:
            del _attempts[key]


def _count_attempt(limits: dict[tuple, int]) -> None:
    window = settings.rate_limit_window_seconds
    with _lock:
        now = clock()
        _remove_expired(now - window)

        for key, limit in limits.items():
            if len(_attempts.get(key, [])) >= limit:
                retry_after = math.ceil(_attempts[key][0] + window - now)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "message": "Too many attempts. Please try again later.",
                        "code": "auth_rate_limited",
                    },
                    headers={"Retry-After": str(retry_after)},
                )

        for key in limits:
            _attempts.setdefault(key, []).append(now)


def limit_login(request: Request, username: str) -> None:
    ip = _client_ip(request)
    _count_attempt({
        # IP und Name zusammen, damit niemand fremde Konten aussperren kann
        ("login-user", ip, username): settings.login_rate_limit_per_user,
        ("login-ip", ip): settings.login_rate_limit_per_ip,
    })


def login_succeeded(request: Request, username: str) -> None:
    # Nur Fehlversuche sollen zählen.
    ip = _client_ip(request)
    with _lock:
        _attempts.pop(("login-user", ip, username), None)
        if _attempts.get(("login-ip", ip)):
            _attempts[("login-ip", ip)].pop()


def limit_forgot_password(request: Request, email: str) -> None:
    _count_attempt({
        ("forgot-email", email.lower()): settings.forgot_password_rate_limit_per_email,
        ("forgot-ip", _client_ip(request)): settings.forgot_password_rate_limit_per_ip,
    })


def limit_reset_password(request: Request) -> None:
    _count_attempt({
        ("reset-ip", _client_ip(request)): settings.reset_password_rate_limit_per_ip,
    })


def reset_limits() -> None:
    with _lock:
        _attempts.clear()
