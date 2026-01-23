"""Global exception handlers for standardized error responses."""
import logging
from typing import Any, Dict

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Base API error class."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "INTERNAL_ERROR",
        details: Dict[str, Any] | None = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(APIError):
    """Resource not found error."""

    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            details={"resource": resource, "identifier": str(identifier)}
        )


class BadRequestError(APIError):
    """Bad request error."""

    def __init__(self, message: str, details: Dict[str, Any] | None = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="BAD_REQUEST",
            details=details
        )


class DatabaseError(APIError):
    """Database error."""

    def __init__(self, message: str = "Database operation failed"):
        super().__init__(
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="DATABASE_ERROR"
        )


class ExternalServiceError(APIError):
    """External service error."""

    def __init__(self, service: str, message: str = "External service unavailable"):
        super().__init__(
            message=message,
            status_code=status.HTTP_502_BAD_GATEWAY,
            error_code="EXTERNAL_SERVICE_ERROR",
            details={"service": service}
        )


class RateLimitError(APIError):
    """Rate limit exceeded error."""

    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Rate limit exceeded. Please try again later.",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
            details={"retry_after_seconds": retry_after}
        )


def create_error_response(
    status_code: int,
    error_code: str,
    message: str,
    details: Dict[str, Any] | None = None,
    request_id: str | None = None
) -> Dict[str, Any]:
    """Create a standardized error response."""
    response = {
        "error": {
            "code": error_code,
            "message": message,
        }
    }

    if details:
        response["error"]["details"] = details

    if request_id:
        response["error"]["request_id"] = request_id

    return response


def setup_exception_handlers(app: FastAPI) -> None:
    """Set up global exception handlers for the FastAPI app."""

    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
        """Handle custom API errors."""
        logger.warning(
            f"API Error: {exc.error_code} - {exc.message}",
            extra={"path": request.url.path, "details": exc.details}
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=create_error_response(
                status_code=exc.status_code,
                error_code=exc.error_code,
                message=exc.message,
                details=exc.details
            )
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Handle request validation errors."""
        errors = []
        for error in exc.errors():
            location = ".".join(str(loc) for loc in error["loc"])
            errors.append({
                "field": location,
                "message": error["msg"],
                "type": error["type"]
            })

        logger.warning(
            f"Validation error on {request.url.path}",
            extra={"errors": errors}
        )

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=create_error_response(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                error_code="VALIDATION_ERROR",
                message="Request validation failed",
                details={"validation_errors": errors}
            )
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(
        request: Request, exc: SQLAlchemyError
    ) -> JSONResponse:
        """Handle database errors."""
        logger.error(
            f"Database error on {request.url.path}: {str(exc)}",
            exc_info=True
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=create_error_response(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                error_code="DATABASE_ERROR",
                message="A database error occurred. Please try again later."
            )
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Handle all unhandled exceptions."""
        logger.error(
            f"Unhandled exception on {request.url.path}: {str(exc)}",
            exc_info=True
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=create_error_response(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="INTERNAL_ERROR",
                message="An unexpected error occurred. Please try again later."
            )
        )
