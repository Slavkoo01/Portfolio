"""
Domain exceptions.

Services raise these; a single set of handlers (handlers.py) turns them into the
consistent JSON error envelope. Routes should not build error responses by hand.
"""
from __future__ import annotations


class AppError(Exception):
    """Base application error -> consistent JSON envelope."""

    status_code = 500
    code = "INTERNAL_ERROR"
    message = "An unexpected error occurred."

    def __init__(self, message: str | None = None, *, code: str | None = None,
                 status_code: int | None = None, details=None):
        super().__init__(message or self.message)
        if message:
            self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        self.details = details

    def to_dict(self) -> dict:
        body = {"error": {"code": self.code, "message": self.message}}
        if self.details is not None:
            body["error"]["details"] = self.details
        return body


class ValidationError(AppError):
    status_code = 422
    code = "VALIDATION_ERROR"
    message = "Validation failed."


class BadRequestError(AppError):
    status_code = 400
    code = "BAD_REQUEST"
    message = "Bad request."


class AuthenticationError(AppError):
    status_code = 401
    code = "AUTHENTICATION_REQUIRED"
    message = "Authentication required."


class AuthorizationError(AppError):
    status_code = 403
    code = "FORBIDDEN"
    message = "You do not have permission to perform this action."


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"
    message = "Resource not found."


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"
    message = "Resource conflict."


class RateLimitError(AppError):
    status_code = 429
    code = "RATE_LIMITED"
    message = "Too many requests."
