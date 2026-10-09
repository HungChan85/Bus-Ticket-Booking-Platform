# VietBus — Bus Ticket Booking Platform

A bus ticket booking application built with React + Vite, Flask, and PostgreSQL. The demo runs locally with Docker Compose and requires no cloud database, cloud account, or custom configuration file.

## Run the demo after cloning

Install and start Docker Desktop with Linux containers, or use Docker Engine with Compose v2. From the repository root:

```bash
git clone https://github.com/HungChan85/Bus-Ticket-Booking-Platform.git
cd Bus-Ticket-Booking-Platform
docker compose up --build -d --wait
```

The first run requires Internet access to download images and dependencies. Compose starts services in this order: healthy PostgreSQL → migrations → seed data → healthy backend → frontend.

- Website: http://localhost:5173
- Admin login: http://localhost:5173/admin/login
- API/database health check: http://localhost:9000/health
- Local PostgreSQL: localhost:5432; database/user `vietbus`, password `vietbus_demo`.

You do not need to create `backend/.env` when using Compose. The default settings are intended for the local demo.

## Demo accounts and sample data

| Role | Email | Password |
| --- | --- | --- |
| Passenger | passenger@example.com | user123 |
| Second passenger | passenger2@example.com | user123 |
| Admin | admin@example.com | admin123 |
| FUTA staff | staff.futa@example.com | staff123 |
| Thanh Buoi staff | staff.thanhbuoi@example.com | staff123 |

Select Passenger or Staff on the standard login page. Administrators use the admin login page.

The seed includes 3 operators, 6 stations, 7 buses, 9 routes, valid fares, and trips from today through the next 7 days (216 trips on a fresh database). Try searching for **Ben Xe Mien Dong → Ben Xe Lien Tinh Da Lat** tomorrow, selecting seats, and making a booking.

The first passenger account has 2 sample tickets for tomorrow's trip. View them in Profile. On a freshly initialized database, you can also look up tickets using serial number `10000000` or `10000001` and phone number `0900000004`.

Business dates and times use `Asia/Ho_Chi_Minh`. At backend startup and daily thereafter, the scheduler adds trips for the next 7 days. Trip statuses are updated every minute. Seed passwords are stored as bcrypt hashes.

## Stop, restart, and manage the database

```bash
# Stop the application; database data remains in the named volume
docker compose down

# Start it again
docker compose up -d --wait

# Inspect service status and logs
docker compose ps -a
docker compose logs db-init backend

# View applied migrations
docker compose run --rm db-init python database/manage.py status

# Apply new migrations
docker compose run --rm db-init python database/manage.py migrate

# Run the seed again and refresh upcoming trips while preserving existing data
docker compose run --rm db-init python database/manage.py seed

# Connect to PostgreSQL using psql inside the container
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

Migrations are tracked by version and checksum, and the seed records its initialization history. Repeating these commands does not duplicate the sample dataset or delete bookings, tickets, or changed passwords.

To **delete this project's entire demo database and recreate it from scratch**, run:

```bash
docker compose down -v
docker compose up --build -d --wait
```

## Optional configuration

Copy the root `.env.example` to `.env` to customize ports, credentials, or secrets. In PowerShell:

```powershell
Copy-Item .env.example .env
```

If you change `BACKEND_PORT`, update `VITE_API_URL` to the backend address accessible from your browser, such as `http://localhost:9001`. When accessing the demo from another computer on your network, use the Docker host's hostname or IP address in `VITE_API_URL`.

`POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` initialize PostgreSQL only when the volume is empty. Changing these variables does not automatically update accounts in an existing database.

## Run the backend and frontend locally

Use Python 3.10+ and Node 22.12+. From the repository root:

```bash
docker compose up -d postgres
python -m venv .venv
```

Activate the virtual environment: Windows PowerShell `.\.venv\Scripts\Activate.ps1`; macOS/Linux `source .venv/bin/activate`. Then run:

```bash
pip install -r backend/requirements.txt
python database/manage.py init
python backend/app.py
```

Open a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

To customize the local backend connection, copy `backend/.env.example` to `backend/.env`. If set, `DATABASE_URL` takes precedence over the `DB_*` settings. Environment variables provided by Compose take precedence over this file.

## Validation

Integration tests use a real PostgreSQL server and create and remove a separate database for each test. They do not reset the demo database. The connection role needs CREATEDB permission, which the default Compose role has.

```bash
docker compose run --rm db-init python -m unittest discover -s backend/tests -v
```

Alternatively, use your local virtual environment with PostgreSQL running:

```bash
python -m unittest discover -s backend/tests -v
cd frontend
npm run build
```

The checks cover repeatable migrations and seeding, rollback after failed migrations or bookings, registration and login, trip search, concurrent seat bookings, refunds, and administrative operations.

## Project structure

```text
backend/
  routes/               Flask API blueprints
  utils/database.py     Psycopg PostgreSQL connector
  utils/bookings.py     Shared transactional booking calls
  trip_maintenance.py   Demo trip generation and status scheduler
  tests/                PostgreSQL integration tests
database/
  migrations/           Ordered, versioned PostgreSQL SQL files
  manage.py             init / migrate / seed / status commands
  seed.py               Idempotent demo dataset
frontend/               React + Vite
docker-compose.yml      postgres → db-init → backend → frontend
```

See the [database and migrations guide](database/README.md), [backend API documentation](backend/README.md), and [ER diagram](database/Entity-relationship-diagram.png). The ER diagram shows the original data model; migrations define the current schema.

