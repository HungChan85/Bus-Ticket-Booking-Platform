"""Integration checks against PostgreSQL; each test uses a temporary database.

Run from the repository root: python -m unittest discover -s backend/tests -v
The configured PostgreSQL role must have CREATEDB (the Compose role does).
"""
from concurrent.futures import ThreadPoolExecutor
from contextlib import redirect_stdout
import io
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
import uuid
from unittest.mock import patch

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from database.manage import apply_migrations, MIGRATION_DIR
from database.seed import seed_demo
from factory import create_app
from utils.database import db_connection


class PostgresDemoTests(unittest.TestCase):
    def setUp(self):
        with db_connection() as admin:
            admin.autocommit = True
            self.admin_dsn = make_conninfo(admin.info.dsn, password=admin.info.password)
            self.db_name = "vietbus_test_" + uuid.uuid4().hex
            admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(self.db_name)))
        self.addCleanup(self.drop_database)
        env = patch.dict(os.environ, {"DATABASE_URL": make_conninfo(self.admin_dsn, dbname=self.db_name)})
        env.start()
        self.addCleanup(env.stop)
        with redirect_stdout(io.StringIO()):
            apply_migrations()
            seed_demo()
        self.client = create_app().test_client()
        with db_connection() as conn:
            self.account_id = conn.execute("SELECT account_id FROM account WHERE email = 'passenger@example.com'").fetchone()[0]
            self.route_id, self.operator_id = conn.execute("SELECT route_id, operator_id FROM routetrip ORDER BY route_id LIMIT 1").fetchone()
            self.bus_id = conn.execute("SELECT bus_id FROM bus WHERE operator_id = %s ORDER BY bus_id LIMIT 1", (self.operator_id,)).fetchone()[0]
            self.fare_id = conn.execute("SELECT fare_id FROM fare WHERE route_id = %s", (self.route_id,)).fetchone()[0]
            self.trip_id = conn.execute("""SELECT sp_schedule_trip(
                (CURRENT_DATE + 2) + TIME '22:15', %s, %s)""", (self.bus_id, self.route_id)).fetchone()[0]

    def drop_database(self):
        with psycopg.connect(self.admin_dsn, autocommit=True) as admin:
            admin.execute(sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(self.db_name)))

    def payload(self, seats=("S3", "S4")):
        return {"currency": "VND", "account_id": self.account_id, "operator_id": self.operator_id,
                "trip_id": self.trip_id, "fare_id": self.fare_id, "seat_codes": list(seats)}

    def login(self, role="admin"):
        email, password = ("admin@example.com", "admin123") if role == "admin" else ("passenger@example.com", "user123")
        response = self.client.post("/api/login", json={"email": email, "password": password, "role": role})
        self.assertEqual(response.status_code, 200, response.get_json())
        return {"Authorization": "Bearer " + response.get_json()["token"]}

    def test_demo_login_and_public_admin_reads(self):
        self.login("passenger")
        headers = self.login()
        for path in ("/health", "/api/routes", "/api/trips", "/api/schedule/stations",
                     f"/api/profile/{self.account_id}", f"/api/profile/{self.account_id}/tickets",
                     "/api/admin/routes", "/api/admin/operators", "/api/admin/stations",
                     "/api/admin/buses", "/api/admin/fares", "/api/admin/trips",
                     "/api/admin/passengers", "/api/admin/staffs", "/api/admin/bookings", "/api/admin/tickets"):
            with self.subTest(path=path):
                response = self.client.get(path, headers=headers)
                self.assertEqual(response.status_code, 200, response.get_json())
        passengers = self.client.get("/api/admin/passengers", headers=headers).get_json()
        self.assertEqual({row["person_name"] for row in passengers}, {"Nguyen Van A", "Tran Thi B"})

    def test_registration_preserves_phone_and_government_id(self):
        response = self.client.post("/api/register", json={
            "role": "PASSENGER", "full_name": "Demo Registration", "dob": "2000-01-02",
            "gov_id": "012345678901", "phone": "0123456789", "email": "new@example.com", "password": "test123",
        })
        self.assertEqual(response.status_code, 201, response.get_json())
        with db_connection() as conn:
            phone, gov = conn.execute("""SELECT a.phone, p.gov_id_num FROM account a
                JOIN person p USING(account_id) WHERE email = 'new@example.com'""").fetchone()
        self.assertEqual((phone, gov), ("0123456789", "012345678901"))

    def test_staff_registration(self):
        response = self.client.post("/api/register", json={
            "role": "STAFF", "full_name": "New Staff", "dob": "1995-01-02", "gov_id": "012345678902",
            "phone": "0123456790", "email": "staff.new@example.com", "password": "staff123", "operator_id": self.operator_id,
        })
        self.assertEqual(response.status_code, 201, response.get_json())

    def test_search_and_arrival_trigger(self):
        with db_connection() as conn:
            station_id = conn.execute("SELECT station_id FROM routetrip WHERE route_id = %s", (self.route_id,)).fetchone()[0]
            day = conn.execute("SELECT CURRENT_DATE + 2").fetchone()[0].isoformat()
            departure, arrival = conn.execute("SELECT service_date, arrival_datetime FROM trip WHERE trip_id = %s", (self.trip_id,)).fetchone()
        self.assertEqual((arrival - departure).total_seconds(), 8 * 3600)
        response = self.client.get(f"/api/schedule/trips?station_id={station_id}&date={day}")
        self.assertEqual(response.status_code, 200, response.get_json())
        self.assertIn(self.trip_id, [trip["trip_id"] for trip in response.get_json()["data"]])
        detail = self.client.get(f"/api/schedule/trips/{self.trip_id}")
        self.assertEqual(detail.status_code, 200, detail.get_json())
        response = self.client.patch(f"/api/trips/{self.trip_id}", json={"service_date": day + " 23:00:00"})
        self.assertEqual(response.status_code, 200, response.get_json())
        with db_connection() as conn:
            hours = conn.execute("SELECT extract(epoch FROM arrival_datetime - service_date) / 3600 FROM trip WHERE trip_id = %s", (self.trip_id,)).fetchone()[0]
        self.assertEqual(hours, 8)

    def test_all_booking_entrypoints_and_ticket_lookup(self):
        headers = self.login()
        for endpoint, seat in (("/api/schedule/bookings", "S3"), ("/api/admin/bookings", "S4"), ("/api/bookings/create", "S5")):
            body = self.payload((seat,))
            if endpoint.endswith("/create"):
                body["seat_list"] = body.pop("seat_codes")
            response = self.client.post(endpoint, json=body, headers=headers)
            self.assertEqual(response.status_code, 201, response.get_json())
        with db_connection() as conn:
            serial = conn.execute("SELECT serial_number FROM ticket WHERE trip_id = %s LIMIT 1", (self.trip_id,)).fetchone()[0]
        response = self.client.post("/api/tickets/lookup", json={"serial_number": serial, "phone": "0900000004"})
        self.assertEqual(response.status_code, 200, response.get_json())
        self.assertEqual(self.client.get(f"/api/trips/{self.trip_id}/seats").get_json()["available_seats"], 37)

    def test_failed_booking_is_atomic_and_duplicate_seats_are_rejected(self):
        first = self.client.post("/api/schedule/bookings", json=self.payload(("S3",)))
        self.assertEqual(first.status_code, 201, first.get_json())
        with db_connection() as conn:
            before = conn.execute("SELECT count(*) FROM booking").fetchone()[0]
        for seats in (("S4", "S3"), ("S4", "S4"), ("S999",), ("bad",)):
            response = self.client.post("/api/schedule/bookings", json=self.payload(seats))
            self.assertEqual(response.status_code, 400, response.get_json())
        with db_connection() as conn:
            self.assertEqual(conn.execute("SELECT count(*) FROM booking").fetchone()[0], before)
            self.assertEqual(conn.execute("SELECT seat_code FROM ticket WHERE trip_id = %s", (self.trip_id,)).fetchall(), [("S3",)])

    def test_concurrent_requests_cannot_double_book(self):
        app = create_app()
        def book():
            with app.test_client() as client:
                return client.post("/api/schedule/bookings", json=self.payload(("S8",))).status_code
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: book(), range(2)))
        self.assertEqual(sorted(results), [201, 400])

    def test_refund_is_persistent_and_frees_seat(self):
        response = self.client.post("/api/schedule/bookings", json=self.payload(("S3",)))
        self.assertEqual(response.status_code, 201, response.get_json())
        ticket_id = response.get_json()["ticket_ids"][0]
        booking_id = response.get_json()["booking_id"]
        with db_connection() as conn:
            self.assertEqual(conn.execute("SELECT total_amount FROM booking WHERE booking_id = %s", (booking_id,)).fetchone()[0], 280000)
        response = self.client.post(f"/api/admin/tickets/{ticket_id}/refund", headers=self.login())
        self.assertEqual(response.status_code, 200, response.get_json())
        with db_connection() as conn:
            self.assertEqual(conn.execute("SELECT ticket_status FROM ticket WHERE ticket_id = %s", (ticket_id,)).fetchone()[0], "Refunded")
            self.assertEqual(conn.execute("SELECT total_amount FROM booking WHERE booking_id = %s", (booking_id,)).fetchone()[0], 0)
        response = self.client.post("/api/schedule/bookings", json=self.payload(("S3",)))
        self.assertEqual(response.status_code, 201, response.get_json())

    def test_trip_cancellation_guards_active_tickets(self):
        response = self.client.post("/api/schedule/bookings", json=self.payload(("S3",)))
        self.assertEqual(response.status_code, 201, response.get_json())
        response = self.client.patch(f"/api/trips/{self.trip_id}", json={"trip_status": "Cancelled"})
        self.assertEqual(response.status_code, 409, response.get_json())

    def test_migrations_and_seed_are_repeatable_and_preserve_user_changes(self):
        response = self.client.post("/api/schedule/bookings", json=self.payload())
        self.assertEqual(response.status_code, 201, response.get_json())
        with db_connection() as conn:
            before = conn.execute("SELECT (SELECT count(*) FROM booking), (SELECT count(*) FROM ticket), (SELECT count(*) FROM trip)").fetchone()
            conn.execute("UPDATE account SET acc_password = 'custom-password' WHERE account_id = %s", (self.account_id,))
        with redirect_stdout(io.StringIO()):
            apply_migrations()
            seed_demo()
            seed_demo()
        with db_connection() as conn:
            after = conn.execute("SELECT (SELECT count(*) FROM booking), (SELECT count(*) FROM ticket), (SELECT count(*) FROM trip)").fetchone()
            self.assertEqual(before, after)
            self.assertEqual(conn.execute("SELECT acc_password FROM account WHERE account_id = %s", (self.account_id,)).fetchone()[0], "custom-password")

    def test_migration_checksum_and_transactional_failure(self):
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder)
            for path in MIGRATION_DIR.glob("*.sql"):
                shutil.copyfile(path, directory / path.name)
            initial = directory / "001_initial_schema.sql"
            original = initial.read_text(encoding="utf-8")
            initial.write_text(original + "\n-- changed", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "Applied migration changed"):
                apply_migrations(directory)
            initial.write_text(original, encoding="utf-8")
            (directory / "003_next.sql").write_text("CREATE TABLE migration_probe(id integer);", encoding="utf-8")
            broken = directory / "004_broken.sql"
            broken.write_text("SELECT * FROM nonexistent_migration_table;", encoding="utf-8")
            with redirect_stdout(io.StringIO()), self.assertRaises(psycopg.errors.UndefinedTable):
                apply_migrations(directory)
            with db_connection() as conn:
                self.assertIsNone(conn.execute("SELECT to_regclass('migration_probe')").fetchone()[0])
                self.assertEqual(conn.execute("SELECT count(*) FROM schema_migrations").fetchone()[0], 2)
            broken.unlink()
            with redirect_stdout(io.StringIO()):
                apply_migrations(directory)
            with db_connection() as conn:
                self.assertEqual(conn.execute("SELECT count(*) FROM schema_migrations").fetchone()[0], 3)

    def test_generated_ids_for_admin_and_public_creation(self):
        headers = self.login()
        response = self.client.post("/api/admin/operators", json={"legal_name": "New Demo Co", "brand_name": "New Demo Bus", "brand_email": "bus@example.com", "tax_id": "012345678901"}, headers=headers)
        self.assertEqual(response.status_code, 201, response.get_json())
        self.assertTrue(response.get_json()["operator"]["operator_id"].startswith("OP"))
        with db_connection() as conn:
            stations = [row[0] for row in conn.execute("SELECT station_id FROM station ORDER BY station_id").fetchall()]
            day = conn.execute("SELECT CURRENT_DATE + 3").fetchone()[0].isoformat()
        body = {"departure_station_id": stations[1], "arrival_station_id": stations[2], "distance": 300,
                "default_duration_time": "08:00:00", "operator_id": self.operator_id, "price": 300000}
        response = self.client.post("/api/routes", json=body)
        self.assertEqual(response.status_code, 201, response.get_json())
        route_id = response.get_json()["route_id"]
        response = self.client.post("/api/trips", json={"route_id": route_id, "bus_id": self.bus_id, "service_date": day + " 10:00:00"})
        self.assertEqual(response.status_code, 201, response.get_json())
        admin_route = self.client.post("/api/admin/routes", json={"station_id": stations[1], "arrival_station": stations[4],
            "default_duration_time": "03:00:00", "distance": 100, "operator_id": self.operator_id}, headers=headers)
        self.assertEqual(admin_route.status_code, 201, admin_route.get_json())
        fare = self.client.post("/api/admin/fares", json={"currency": "VND", "discount": 0, "taxes": 0, "surcharges": 0,
            "base_fare": 100000, "seat_price": 100000, "seat_class": "Standard", "route_id": admin_route.get_json()["route_id"],
            "valid_from": day, "valid_to": "2099-12-31"}, headers=headers)
        self.assertEqual(fare.status_code, 201, fare.get_json())
        booking = self.client.post("/api/admin/bookings", json=self.payload(("S3",)), headers=headers)
        self.assertEqual(booking.status_code, 201, booking.get_json())
        booking_id = booking.get_json()["booking_id"]
        added = self.client.post(f"/api/admin/bookings/{booking_id}/tickets", json={
            "trip_id": self.trip_id, "fare_id": self.fare_id, "seat_codes": ["S4"],
        }, headers=headers)
        self.assertEqual(added.status_code, 201, added.get_json())
        self.assertEqual(len(added.get_json()["tickets_created"]), 1)
        with db_connection() as conn:
            self.assertEqual(conn.execute("SELECT total_amount FROM booking WHERE booking_id = %s", (booking_id,)).fetchone()[0], 560000)


if __name__ == "__main__":
    unittest.main()
