"""Run with `python database/manage.py init|migrate|seed|status`."""
import argparse
import hashlib
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from utils.database import db_connection

MIGRATION_DIR = Path(__file__).resolve().parent / "migrations"
MIGRATION_LOCK = 726842101


def migration_files(directory=MIGRATION_DIR):
    files = sorted(directory.glob("[0-9]*_*.sql"))
    if not files:
        raise RuntimeError(f"No SQL migrations found in {directory}")
    versions = [path.name.split("_", 1)[0] for path in files]
    if len(versions) != len(set(versions)):
        raise RuntimeError("Migration version numbers must be unique")
    return files


def apply_migrations(directory=MIGRATION_DIR):
    files = migration_files(directory)
    with db_connection() as conn:
        with conn.transaction():
            # Concurrent startup processes cannot apply the same migration twice.
            conn.execute("SELECT pg_advisory_xact_lock(%s)", (MIGRATION_LOCK,))
            conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version TEXT PRIMARY KEY,
                    checksum TEXT NOT NULL,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """)
            applied = dict(conn.execute("SELECT version, checksum FROM schema_migrations").fetchall())
            names = {path.name for path in files}
            missing = set(applied) - names
            if missing:
                raise RuntimeError(f"Previously applied migration files are missing: {sorted(missing)}")
            for path in files:
                source = path.read_text(encoding="utf-8")
                # Normalize checkout line endings so Windows/Linux share checksums.
                checksum = hashlib.sha256(source.encode("utf-8")).hexdigest()
                if path.name in applied:
                    if applied[path.name] != checksum:
                        raise RuntimeError(f"Applied migration changed: {path.name}. Add a new migration instead.")
                    continue
                print(f"Applying {path.name}", flush=True)
                conn.execute(source, prepare=False)
                conn.execute("INSERT INTO schema_migrations(version, checksum) VALUES (%s, %s)",
                             (path.name, checksum))
    print("Database migrations are up to date.", flush=True)


def migration_status():
    with db_connection() as conn:
        exists = conn.execute("SELECT to_regclass('public.schema_migrations')").fetchone()[0]
        applied = dict(conn.execute("SELECT version, checksum FROM schema_migrations").fetchall()) if exists else {}
    for path in migration_files():
        checksum = hashlib.sha256(path.read_text(encoding="utf-8").encode("utf-8")).hexdigest()
        state = "pending" if path.name not in applied else (
            "applied" if applied[path.name] == checksum else "CHANGED")
        print(f"{state:8} {path.name}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("init", "migrate", "seed", "status"))
    command = parser.parse_args().command
    if command in ("init", "migrate"):
        apply_migrations()
    if command in ("init", "seed"):
        from database.seed import seed_demo
        seed_demo()
    if command == "status":
        migration_status()


if __name__ == "__main__":
    main()
