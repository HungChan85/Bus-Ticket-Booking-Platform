# PostgreSQL database and migrations

The demo uses PostgreSQL 17, provided by Docker Compose. Database state lives in the `postgres_data` named volume. No cloud endpoint or CA certificate is required.

## Lifecycle

`docker compose up --build -d --wait` waits for PostgreSQL's healthcheck, then runs `python database/manage.py init` in the one-shot `db-init` service. The API starts only after initialization succeeds. Compose startup dependencies follow the [official Docker documentation](https://docs.docker.com/compose/how-tos/startup-order/).

`init` applies SQL migrations, then seeds demo data. The API also refreshes upcoming trips at startup, daily at midnight, and trip statuses once per minute. All business times use `Asia/Ho_Chi_Minh`. Existing trips and booking history are retained.

## Commands

Run from the repository root:

```bash
docker compose run --rm db-init python database/manage.py init
docker compose run --rm db-init python database/manage.py migrate
docker compose run --rm db-init python database/manage.py seed
docker compose run --rm db-init python database/manage.py status
```

With Python dependencies installed locally, use `python database/manage.py <command>`. The connection comes from `backend/.env`, environment variables or `DATABASE_URL`; see [backend/.env.example](../backend/.env.example).

## Adding a migration

1. Create the next numbered UTF-8 file in `database/migrations/`, for example `003_add_booking_index.sql`.
2. Write PostgreSQL DDL/data changes without `CREATE DATABASE`, `BEGIN`, `COMMIT` or psql meta commands. The runner owns the transaction. Operations that require running outside a transaction, such as `CREATE INDEX CONCURRENTLY`, are not supported by this runner.
3. Run `migrate`. If using Docker, rebuild `db-init` to include the new file: `docker compose build db-init`.
4. Inspect `status` and run integration tests.

The runner records each filename, SHA-256 checksum and timestamp in `schema_migrations`. Applied files must remain immutable; use another migration for subsequent changes. Windows/Linux line endings are normalized before hashing.

A PostgreSQL advisory lock prevents concurrent migration runners from applying changes twice. Pending migrations and their history entries are committed atomically. An error rolls back the pending batch and stops startup; previously applied migrations are preserved. Migrations are forward-only; no automatic downgrade command is provided.

## Current schema

- `001_initial_schema.sql`: tables, identities, foreign keys, checks, indexes and seed history.
- `002_business_logic.sql`: PostgreSQL functions and the arrival/cancellation trigger.

The core relationships follow the [original ER diagram](Entity-relationship-diagram.png). Changes from the former schema include string phone/government/tax IDs (preserving leading zeroes), `bus.operator_id`, the arrival-station foreign key, unique email/phone, `booking.created_at` and generated unique ticket serial numbers.

Only active tickets (`Issued`/`Used`) occupy a unique `(trip_id, seat_code)`. Refunded/cancelled tickets remain in history and allow the seat to be booked again.

## Database functions and triggers

The API calls PostgreSQL functions with `SELECT`; ID-returning functions replace the former output-parameter procedures.

| Function | Purpose |
| --- | --- |
| `sp_create_passenger_account` | Create account, person and passenger atomically |
| `sp_create_staff_account` | Create account, person and staff atomically |
| `sp_schedule_trip` | Validate active bus/route and return the new trip ID |
| `sp_create_booking_with_tickets` | Validate trip, fare, operator and seats; create booking/tickets; return booking ID |
| `sp_refund_ticket` | Refund an issued ticket and recalculate booking total |
| `fn_get_available_seats` | Count capacity minus active tickets |
| `fn_calculate_booking_total` | Sum non-refunded, non-cancelled tickets |

`trg_trip_arrival_and_cancellation` calculates arrival time at insertion and when route/departure changes; it blocks cancellation while issued tickets exist.

The booking function locks the trip row, checks available capacity and duplicate/taken seat codes, then creates the entire booking in the caller's transaction. A partial unique index also prevents concurrent duplicate seats. Exceptions roll back the complete transaction.

The former MySQL event scheduler is replaced by `backend/trip_maintenance.py` using APScheduler. It can be disabled with `ENABLE_DEMO_SCHEDULER=0` when running the backend locally.

## Demo seed

`seed.py` inserts five accounts with bcrypt passwords, three operators, six stations, seven buses, nine routes, valid fares, upcoming trips and a sample two-ticket booking. Credentials and a sample ticket lookup are listed in the [root README](../README.md).

A transaction and advisory lock protect seeding. The `demo-v1` entry in `seed_history` marks completion. Further runs preserve existing accounts/passwords, tickets, bookings and other edits, while adding upcoming trips. Fleet selection uses the route's operator; cancelled trips are preserved.

The seed does not import the expired cloud database. It creates a fresh local demo dataset.

## Reset and inspection

```bash
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
docker compose logs db-init
```

To discard **all database data in this project's Compose volume** and start fresh:

```bash
docker compose down -v
docker compose up --build -d --wait
```

Tests create temporary databases with names beginning `vietbus_test_` and remove them after each test. Run:

```bash
docker compose run --rm db-init python -m unittest discover -s backend/tests -v
```
