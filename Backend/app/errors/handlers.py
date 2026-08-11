"""Register global error handlers that always return JSON (never HTML pages)."""
from __future__ import annotations

import logging

from flask import Flask, jsonify
from marshmallow import ValidationError as MarshmallowValidationError
from werkzeug.exceptions import HTTPException

from app.errors.exceptions import AppError

log = logging.getLogger(__name__)


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(AppError)
    def handle_app_error(err: AppError):
        return jsonify(err.to_dict()), err.status_code

    @app.errorhandler(MarshmallowValidationError)
    def handle_marshmallow(err: MarshmallowValidationError):
        body = {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Validation failed.",
                "details": err.messages,
            }
        }
        return jsonify(body), 422

    @app.errorhandler(HTTPException)
    def handle_http(err: HTTPException):
        body = {
            "error": {
                "code": err.name.upper().replace(" ", "_"),
                "message": err.description or err.name,
            }
        }
        return jsonify(body), err.code or 500

    @app.errorhandler(Exception)
    def handle_unexpected(err: Exception):
        # Log the real error; never leak internals to the client.
        log.exception("Unhandled exception: %s", err)
        body = {
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred.",
            }
        }
        return jsonify(body), 500
