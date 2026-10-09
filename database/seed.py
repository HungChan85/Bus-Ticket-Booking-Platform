"""Idempotent demo dataset. Passwords are hashed with the API's bcrypt scheme."""
import bcrypt

from trip_maintenance import populate_upcoming_trips, refresh_trip_statuses
from utils.database import db_connection

SEED_VERSION = "demo-v1"


def seed_demo():
    with db_connection() as conn:
        conn.execute("SELECT pg_advisory_xact_lock(%s)", (726842103,))
        already_seeded = conn.execute("SELECT 1 FROM seed_history WHERE version = %s", (SEED_VERSION,)).fetchone()
        if already_seeded:
            populate_upcoming_trips(conn)
            refresh_trip_statuses(conn)
            print("Demo seed already exists; refreshed upcoming trips without resetting data.", flush=True)
            return

        operators = []
        for legal, brand, email, tax in (
            ("Cong ty CP Xe Khach Phuong Trang", "FUTA Bus Lines", "hotro@futabus.vn", "11001100"),
            ("Cong ty TNHH Thanh Buoi", "Thanh Buoi", "cskh@thanhbuoi.com.vn", "22002200"),
            ("Cong ty TNHH Van Tai Kumho", "Kumho Samco", "contact@kumhosamco.com", "33003300"),
        ):
            conn.execute("""INSERT INTO operator(legal_name, brand_name, brand_email, tax_id)
                VALUES (%s, %s, %s, %s) ON CONFLICT (brand_email) DO NOTHING""", (legal, brand, email, tax))
            operators.append(conn.execute("SELECT operator_id FROM operator WHERE brand_email = %s", (email,)).fetchone()[0])

        accounts = {}
        for name, email, phone, password, gov, role, op in (
            ("Quan Tri Vien", "admin@example.com", "0900000001", "admin123", "000000000001", "staff", operators[0]),
            ("NV Ban Ve FUTA", "staff.futa@example.com", "0900000002", "staff123", "000000000002", "staff", operators[0]),
            ("NV Ban Ve Thanh Buoi", "staff.thanhbuoi@example.com", "0900000003", "staff123", "000000000003", "staff", operators[1]),
            ("Nguyen Van A", "passenger@example.com", "0900000004", "user123", "000000000004", "passenger", None),
            ("Tran Thi B", "passenger2@example.com", "0900000005", "user123", "000000000005", "passenger", None),
        ):
            hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            conn.execute("""INSERT INTO account(email, phone, acc_password) VALUES (%s, %s, %s)
                ON CONFLICT (email) DO NOTHING""", (email, phone, hashed))
            account_id = conn.execute("SELECT account_id FROM account WHERE email = %s", (email,)).fetchone()[0]
            accounts[email] = account_id
            conn.execute("""INSERT INTO person(person_name, date_of_birth, gov_id_num, account_id)
                VALUES (%s, '1990-01-01', %s, %s) ON CONFLICT (account_id) DO NOTHING""", (name, gov, account_id))
            person_id = conn.execute("SELECT person_id FROM person WHERE account_id = %s", (account_id,)).fetchone()[0]
            if role == "staff":
                conn.execute("""INSERT INTO staff(person_id, hire_date, operator_id)
                    VALUES (%s, CURRENT_DATE, %s) ON CONFLICT (person_id) DO NOTHING""", (person_id, op))
            else:
                conn.execute("INSERT INTO passenger(person_id) VALUES (%s) ON CONFLICT (person_id) DO NOTHING", (person_id,))

        stations = []
        for city, name, province, address, op, lat, lng in (
            ("Ho Chi Minh", "Ben Xe Mien Dong", "HCM", "292 Dinh Bo Linh, Binh Thanh", operators[0], 10.81, 106.70),
            ("Ho Chi Minh", "Ben Xe Mien Tay", "HCM", "395 Kinh Duong Vuong, Binh Tan", operators[0], 10.74, 106.61),
            ("Da Lat", "Ben Xe Lien Tinh Da Lat", "Lam Dong", "01 To Hien Thanh", operators[1], 11.93, 108.44),
            ("Can Tho", "Ben Xe Trung Tam Can Tho", "Can Tho", "Khu Do Thi Nam Can Tho", operators[0], 10.01, 105.76),
            ("Vung Tau", "Ben Xe Vung Tau", "Ba Ria - Vung Tau", "Nam Ky Khoi Nghia", operators[2], 10.35, 107.08),
            ("Nha Trang", "Ben Xe Phia Nam Nha Trang", "Khanh Hoa", "Vinh Trung, Nha Trang", operators[0], 12.25, 109.18),
        ):
            conn.execute("""INSERT INTO station(city, station_name, province, address_station, operator_id, latitude, longtitude)
                VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (station_name) DO NOTHING""",
                         (city, name, province, address, op, lat, lng))
            stations.append(conn.execute("SELECT station_id FROM station WHERE station_name = %s", (name,)).fetchone()[0])
        for plate, capacity, vehicle, op, status in (
            ("51B-100.01", 40, "Sleeper", operators[0], "Active"),
            ("51B-100.02", 40, "Sleeper", operators[0], "Active"),
            ("51B-100.99", 24, "Limousine", operators[0], "Active"),
            ("49B-200.01", 40, "Sleeper", operators[1], "Active"),
            ("49B-200.02", 44, "Seater", operators[1], "Active"),
            ("72B-300.01", 24, "Limousine", operators[2], "Active"),
            ("72B-300.02", 44, "Seater", operators[2], "Maintenance"),
        ):
            conn.execute("""INSERT INTO bus(plate_number, capacity, vehicle_type, operator_id, bus_active_flag)
                VALUES (%s, %s, %s, %s, %s) ON CONFLICT (plate_number) DO NOTHING""", (plate, capacity, vehicle, op, status))

        routes = []
        for dep, arr, duration, distance, op, price in (
            (0, 2, "08:00:00", 305, operators[0], 280000),
            (1, 3, "04:00:00", 170, operators[0], 165000),
            (0, 4, "02:30:00", 100, operators[2], 200000),
            (0, 5, "09:00:00", 430, operators[0], 320000),
            (2, 5, "03:30:00", 135, operators[1], 150000),
            (3, 4, "05:00:00", 220, operators[0], 210000),
            (5, 4, "07:00:00", 340, operators[2], 350000),
            (0, 3, "04:30:00", 170, operators[1], 140000),
            (2, 1, "08:30:00", 310, operators[0], 290000),
        ):
            route = conn.execute("""SELECT route_id FROM routetrip
                WHERE station_id = %s AND arrival_station = %s AND operator_id = %s""", (stations[dep], stations[arr], op)).fetchone()
            route_id = route[0] if route else conn.execute("""INSERT INTO routetrip
                (station_id, arrival_station, default_duration_time, distance, operator_id)
                VALUES (%s, %s, %s, %s, %s) RETURNING route_id""", (stations[dep], stations[arr], duration, distance, op)).fetchone()[0]
            routes.append(route_id)
            conn.execute("""INSERT INTO fare(route_id, seat_class, base_fare, seat_price, valid_from, valid_to)
                SELECT %s, 'Standard', %s, %s, CURRENT_DATE - 365, CURRENT_DATE + 3650
                WHERE NOT EXISTS (SELECT 1 FROM fare WHERE route_id = %s)""", (route_id, price, price, route_id))

        created = populate_upcoming_trips(conn)
        refresh_trip_statuses(conn)
        # Two sample seats on tomorrow's sleeper trip for profile and ticket lookup.
        trip_id, fare_id = conn.execute("""SELECT t.trip_id, f.fare_id FROM trip t
            JOIN fare f ON f.route_id = t.route_id WHERE t.route_id = %s
              AND t.service_date::date = CURRENT_DATE + 1 ORDER BY t.service_date, f.fare_id LIMIT 1""", (routes[0],)).fetchone()
        conn.execute("""SELECT sp_create_booking_with_tickets('VND', %s, %s, %s, %s, '["S1", "S2"]'::jsonb, NULL)""",
                     (accounts["passenger@example.com"], operators[0], trip_id, fare_id))
        conn.execute("INSERT INTO seed_history(version) VALUES (%s)", (SEED_VERSION,))
    print(f"Demo seed ready: 5 accounts, 3 operators, 6 stations, 7 buses, 9 routes, {created} trips.", flush=True)
    print("Passenger: passenger@example.com / user123; admin: admin@example.com / admin123", flush=True)
