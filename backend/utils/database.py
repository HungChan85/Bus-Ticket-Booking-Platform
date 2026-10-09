"""PostgreSQL connections shared by the API, migrations and demo seed."""
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def db_connection():
    # Container environment takes precedence over an optional local .env file.
    settings = {
        "connect_timeout": 10,
        "options": "-c timezone=" + os.getenv("APP_TIMEZONE", "Asia/Ho_Chi_Minh"),
    }
    if os.getenv("DATABASE_URL"):
        return psycopg.connect(os.environ["DATABASE_URL"], **settings)
    return psycopg.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", "5432")),
        user=os.getenv("DB_USER", "vietbus"),
        password=os.getenv("DB_PASSWORD", "vietbus_demo"),
        dbname=os.getenv("DB_NAME", "vietbus"),
        sslmode=os.getenv("DB_SSLMODE", "prefer"),
        **settings,
    )


__all__ = ["db_connection", "dict_row"]
