"""
User management business logic.

For Phase 4 this provides admin-user creation (used by a CLI command and later
by the seed script). Full user CRUD isn't needed for a single-admin portfolio.
"""
from __future__ import annotations

from app.errors.exceptions import ConflictError, ValidationError
from app.models.enums import UserRole
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.security import hash_password


class UserService:
    def __init__(self, users: UserRepository | None = None):
        self.users = users or UserRepository()

    def create_user(
        self,
        username: str,
        email: str,
        password: str,
        role: str = UserRole.USER,
    ) -> User:
        if role not in UserRole.ALL:
            raise ValidationError(f"Invalid role: {role}")
        if len(password) < 8:
            raise ValidationError("Password must be at least 8 characters.")
        if self.users.get_by_username(username):
            raise ConflictError("Username already taken.", code="USERNAME_TAKEN")
        if self.users.get_by_email(email):
            raise ConflictError("Email already registered.", code="EMAIL_TAKEN")

        user = User(
            username=username,
            email=email,
            password_hash=hash_password(password),
            role=role,
            is_active=True,
        )
        self.users.add(user)
        self.users.commit()
        return user

    def create_admin(self, username: str, email: str, password: str) -> User:
        return self.create_user(username, email, password, role=UserRole.ADMIN)
