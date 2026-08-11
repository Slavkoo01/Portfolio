"""
Custom Flask CLI commands.

  flask create-admin        (prompts for username/email/password)
  flask create-admin --username admin --email a@b.com   (password prompted securely)

Registered in the application factory. Passwords are never taken as plain CLI
args to avoid shell-history leakage; they're prompted and hidden.
"""
from __future__ import annotations

import click
from flask import Flask
from flask.cli import with_appcontext

from app.errors.exceptions import AppError
from app.services.user_service import UserService


def register_cli(app: Flask) -> None:
    app.cli.add_command(create_admin_command)


@click.command("create-admin")
@click.option("--username", prompt=True)
@click.option("--email", prompt=True)
@click.password_option()  # prompts twice, hidden input
@with_appcontext
def create_admin_command(username: str, email: str, password: str):
    """Create an ADMIN user."""
    try:
        user = UserService().create_admin(username, email, password)
    except AppError as e:
        raise click.ClickException(e.message)
    click.echo(f"Admin created: id={user.id} username={user.username} email={user.email}")
