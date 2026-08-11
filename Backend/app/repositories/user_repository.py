"""User data access."""
from __future__ import annotations

from sqlalchemy import select

from app.extensions import db
from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def get_by_username(self, username: str) -> User | None:
        stmt = select(User).where(User.username == username)
        return db.session.scalar(stmt)

    def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        return db.session.scalar(stmt)

    def get_by_username_or_email(self, identifier: str) -> User | None:
        stmt = select(User).where(
            (User.username == identifier) | (User.email == identifier)
        )
        return db.session.scalar(stmt)
