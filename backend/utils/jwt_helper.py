"""Lightweight JWT helpers and decorators for role-based auth."""
from __future__ import annotations

import datetime
from functools import wraps
from typing import Iterable, Optional

import jwt
from flask import current_app, jsonify, request, g


def _get_secret() -> str:
    return current_app.config.get("JWT_SECRET", "")


def _get_algorithm() -> str:
    return current_app.config.get("JWT_ALGORITHM", "HS256")


def _get_exp_seconds() -> int:
    return int(current_app.config.get("JWT_EXPIRES_IN_SECONDS", 60 * 60 * 24))


def generate_token(payload: dict, expires_in: Optional[int] = None) -> str:
    """Generate a signed JWT with an expiration."""
    exp_seconds = expires_in if expires_in is not None else _get_exp_seconds()
    now = datetime.datetime.utcnow()
    to_encode = {**payload, "iat": now, "exp": now + datetime.timedelta(seconds=exp_seconds)}
    token = jwt.encode(to_encode, _get_secret(), algorithm=_get_algorithm())
    return token


def decode_token(token: str) -> dict:
    """Decode and validate a JWT, raising if invalid/expired."""
    return jwt.decode(token, _get_secret(), algorithms=[_get_algorithm()])


def token_required(allowed_roles: Optional[Iterable[str]] = None):
    """
    Decorator to protect routes. If allowed_roles is provided, the user's role must match.
    Populates g.current_user with the decoded token payload.
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "auth_required", "message": "Missing Bearer token"}), 401

            token = auth_header.split(" ", 1)[1].strip()
            if not token:
                return jsonify({"error": "auth_required", "message": "Empty token"}), 401

            try:
                payload = decode_token(token)
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "token_expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "invalid_token"}), 401

            role = payload.get("role")
            if allowed_roles and role not in allowed_roles:
                return jsonify({"error": "forbidden", "message": "Insufficient role"}), 403

            g.current_user = payload
            return fn(*args, **kwargs)

        return wrapper

    return decorator
