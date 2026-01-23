"""Rate limiting configuration using slowapi."""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

from app.config import get_settings

settings = get_settings()


def get_client_ip(request: Request) -> str:
    """Get client IP address, considering proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=get_client_ip)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom handler for rate limit exceeded errors."""
    return JSONResponse(
        status_code=429,
        content={
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "Rate limit exceeded. Please try again later.",
                "details": {
                    "limit": str(exc.detail),
                    "retry_after_seconds": 60
                }
            }
        },
        headers={"Retry-After": "60"}
    )


# Rate limit decorators for common use cases
def default_limit():
    """Default rate limit for general endpoints."""
    return f"{settings.rate_limit_requests}/minute"


def upload_limit():
    """Stricter rate limit for upload endpoints."""
    return f"{settings.rate_limit_upload}/minute"


def satellite_limit():
    """Rate limit for satellite data fetch endpoints."""
    return "5/minute"
