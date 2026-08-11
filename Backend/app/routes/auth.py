"""
Auth HTTP endpoints.

  POST /api/auth/login   -> verify credentials, start session, set CSRF cookie
  POST /api/auth/logout  -> clear session
  GET  /api/auth/me      -> current user (401 if not logged in)
  GET  /api/auth/csrf    -> issue a CSRF cookie (frontend calls on app load)

Routes stay thin: validate input via schema, call the service, shape output via
schema. No business logic here.
"""
from __future__ import annotations

from flask import Blueprint, g, jsonify, request

from app.auth.csrf import set_csrf_cookie
from app.auth.decorators import login_required
from app.auth.session import load_current_user, login_session, logout_session
from app.errors.exceptions import ValidationError
from app.schemas.auth import LoginSchema, UserOutSchema
from app.services.auth_service import AuthService

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

_login_schema = LoginSchema()
_user_out = UserOutSchema()


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    errors = _login_schema.validate(payload)
    if errors:
        raise ValidationError(details=errors)

    data = _login_schema.load(payload)
    user = AuthService().authenticate(data["identifier"], data["password"])

    login_session(user)
    response = jsonify({"user": _user_out.dump(user)})
    set_csrf_cookie(response)
    return response, 200


@auth_bp.post("/logout")
@login_required
def logout():
    logout_session()
    return jsonify({"message": "Logged out."}), 200


@auth_bp.get("/me")
def me():
    user = load_current_user()
    if user is None:
        return jsonify({"user": None}), 200
    return jsonify({"user": _user_out.dump(user)}), 200


@auth_bp.get("/csrf")
def csrf():
    response = jsonify({"message": "CSRF cookie set."})
    set_csrf_cookie(response)
    return response, 200
