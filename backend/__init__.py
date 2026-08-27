"""Backend package initialization.

Exports the application factory and database helper.
Factory implementation lives in `backend.factory`.
"""

from .utils.database import db_connection
from .factory import create_app, DefaultConfig

__all__ = ["create_app", "db_connection", "DefaultConfig"]
