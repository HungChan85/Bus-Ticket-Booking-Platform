from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from utils.database import db_connection

schedule_bp = Blueprint("schedule", __name__)


def _format_time(value):
    if isinstance(value, datetime):
        return value.strftime("%H:%M")
    return ""


def _format_duration(value):
    if isinstance(value, timedelta):
        total_minutes = int(value.total_seconds() // 60)
        hours = total_minutes // 60
        minutes = total_minutes % 60
        if minutes == 0:
            return f"{hours}h"
        if hours == 0:
            return f"{minutes}m"
        return f"{hours}h {minutes}m"
    if value:
        return str(value)
    return ""


@schedule_bp.route("/stations", methods=["GET"])
def list_stations():
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT station_id, city, station_name
            FROM station
            WHERE active_flag = 'Active'
            ORDER BY city, station_name
            """
        )
        rows = cursor.fetchall()
        stations = [
            {
                "station_id": str(row["station_id"]),
                "city": row["city"],
                "station_name": row["station_name"],
            }
            for row in rows
        ]
        return jsonify({"data": stations}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        cursor.close()
        conn.close()


@schedule_bp.route("/trips", methods=["GET"])
def list_trips():
    station_id = request.args.get("station_id")
    travel_date = request.args.get("date")
    destination_id = request.args.get("destination_id")

    if not station_id or not travel_date:
        return jsonify({"error": "station_id and date are required"}), 400

    try:
        station_id_value = int(station_id)
    except ValueError:
        return jsonify({"error": "station_id must be numeric"}), 400

    destination_id_value = None
    if destination_id:
        try:
            destination_id_value = int(destination_id)
        except ValueError:
            return jsonify({"error": "destination_id must be numeric"}), 400

    try:
        datetime.strptime(travel_date, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "date must follow YYYY-MM-DD"}), 400

    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT
                t.trip_id,
                t.service_date,
                t.arrival_datetime,
                rt.route_id,
                rt.default_duration_time,
                dep.station_id AS departure_station_id,
                dep.station_name AS departure_name,
                dep.city AS departure_city,
                arr.station_name AS arrival_name,
                arr.city AS arrival_city,
                arr.station_id AS arrival_station_id,
                b.vehicle_type,
                op.brand_name,
                COALESCE((
                    SELECT seat_price
                    FROM fare f
                    WHERE f.route_id = rt.route_id
                    ORDER BY f.valid_from DESC
                    LIMIT 1
                ), 0) AS seat_price,
                fn_get_available_seats(t.trip_id) AS available_seats
            FROM trip t
            JOIN routetrip rt ON t.route_id = rt.route_id
            JOIN station dep ON rt.station_id = dep.station_id
            LEFT JOIN station arr ON rt.arrival_station = arr.station_id
            JOIN bus b ON t.bus_id = b.bus_id
            JOIN operator op ON rt.operator_id = op.operator_id
            WHERE dep.station_id = %s
              AND DATE(t.service_date) = %s
              AND t.trip_status = 'Scheduled'
        """

        params = [station_id_value, travel_date]
        if destination_id_value is not None:
            query += " AND arr.station_id = %s"
            params.append(destination_id_value)

        query += "\n            ORDER BY t.service_date ASC"

        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()

        trips = []
        for row in rows:
            route_name = row["departure_city"]
            if row["arrival_city"]:
                route_name = f"{route_name} -> {row['arrival_city']}"
            available = row["available_seats"]
            trip_payload = {
                "trip_id": row["trip_id"],
                "station_id": str(row["departure_station_id"]),
                "station_name": row["departure_name"],
                "route_name": route_name,
                "time_start": _format_time(row["service_date"]),
                "time_end": _format_time(row["arrival_datetime"]),
                "duration": _format_duration(row["default_duration_time"]),
                "vehicle_type": row["vehicle_type"],
                "brand_name": row["brand_name"],
                "price": row["seat_price"],
                "available_seats": available if available is not None else 0,
                "arrival_station_id": str(row["arrival_station_id"]) if row["arrival_station_id"] is not None else None,
                "arrival_city": row["arrival_city"],
            }
            trips.append(trip_payload)

        return jsonify({"data": trips}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        cursor.close()
        conn.close()


@schedule_bp.route("/trips/<int:trip_id>", methods=["GET"])
def get_trip_detail(trip_id):
    """
    Lấy chi tiết đầy đủ của một chuyến xe theo trip_id
    Bao gồm: thông tin tuyến đường, xe, giá vé, số ghế trống, biển số xe, ngày giờ khởi hành/đến
    """
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT
                t.trip_id,
                t.service_date,
                t.arrival_datetime,
                t.trip_status,
                rt.route_id,
                rt.default_duration_time,
                rt.distance,
                dep.station_id AS departure_station_id,
                dep.station_name AS departure_name,
                dep.city AS departure_city,
                dep.address_station AS departure_address,
                arr.station_id AS arrival_station_id,
                arr.station_name AS arrival_name,
                arr.city AS arrival_city,
                arr.address_station AS arrival_address,
                b.bus_id,
                b.plate_number,
                b.capacity,
                b.vehicle_type,
                op.operator_id,
                op.brand_name,
                op.legal_name,
                COALESCE((
                    SELECT seat_price
                    FROM fare f
                    WHERE f.route_id = rt.route_id
                    ORDER BY f.valid_from DESC
                    LIMIT 1
                ), 0) AS seat_price,
                (
                    SELECT fare_id
                    FROM fare f2
                    WHERE f2.route_id = rt.route_id
                    ORDER BY f2.valid_from DESC
                    LIMIT 1
                ) AS fare_id,
                fn_get_available_seats(t.trip_id) AS available_seats
            FROM trip t
            JOIN routetrip rt ON t.route_id = rt.route_id
            JOIN station dep ON rt.station_id = dep.station_id
            LEFT JOIN station arr ON rt.arrival_station = arr.station_id
            JOIN bus b ON t.bus_id = b.bus_id
            JOIN operator op ON rt.operator_id = op.operator_id
            WHERE t.trip_id = %s
        """
        
        cursor.execute(query, (trip_id,))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({"error": "Trip not found"}), 404
        
        # Format dữ liệu trả về
        route_name = row["departure_city"]
        if row["arrival_city"]:
            route_name = f"{route_name} -> {row['arrival_city']}"
        
        available = row["available_seats"]
        
        trip_detail = {
            "trip_id": row["trip_id"],
            "trip_status": row["trip_status"],
            
            # Thông tin tuyến đường
            "route_id": row["route_id"],
            "route_name": route_name,
            "distance": row["distance"],
            "duration": _format_duration(row["default_duration_time"]),
            
            # Điểm đi
            "station_id": str(row["departure_station_id"]),
            "station_name": row["departure_name"],
            "city": row["departure_city"],
            "departure_address": row["departure_address"],
            
            # Điểm đến
            "arrival_station_id": str(row["arrival_station_id"]) if row["arrival_station_id"] else None,
            "arrival_station_name": row["arrival_name"],
            "arrival_city": row["arrival_city"],
            "arrival_address": row["arrival_address"],
            
            # Thời gian
            "service_date": row["service_date"].isoformat() if row["service_date"] else None,
            "time_start": _format_time(row["service_date"]),
            "arrival_datetime": row["arrival_datetime"].isoformat() if row["arrival_datetime"] else None,
            "time_end": _format_time(row["arrival_datetime"]),
            
            # Thông tin xe
            "bus_id": row["bus_id"],
            "plate_number": row["plate_number"],
            "vehicle_type": row["vehicle_type"],
            "capacity": row["capacity"],
            
            # Nhà xe
            "operator_id": row["operator_id"],
            "brand_name": row["brand_name"],
            "legal_name": row["legal_name"],
            
            # Giá vé và ghế
            "fare_id": row["fare_id"],
            "price": row["seat_price"],
            "available_seats": available if available is not None else 0,
        }
        
        return jsonify({"data": trip_detail}), 200
        
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
    finally:
        cursor.close()
        conn.close()


@schedule_bp.route("/bookings", methods=["POST"])
def create_booking_with_multiple_tickets():
    data = request.get_json() or {}

    currency    = data.get("currency")
    account_id  = data.get("account_id")
    operator_id = data.get("operator_id")
    trip_id     = data.get("trip_id")
    fare_id     = data.get("fare_id")
    seat_codes  = data.get("seat_codes")  # list[str] (VD: ["1","2","3"])

    # 1. Validate input cơ bản
    if not all([currency, account_id, operator_id, trip_id, fare_id, seat_codes]):
        return jsonify({"error": "missing_field"}), 400

    if not isinstance(seat_codes, list) or len(seat_codes) == 0:
        return jsonify({"error": "seat_codes_must_be_non_empty_array"}), 400

    # Đảm bảo mọi phần tử là string
    seat_codes = [str(s) for s in seat_codes]

    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        # 2. Lấy thông tin trip + bus
        cursor.execute("""
            SELECT t.trip_id, t.route_id, b.capacity
            FROM trip t
            JOIN bus b ON t.bus_id = b.bus_id
            WHERE t.trip_id = %s
        """, (trip_id,))
        trip_row = cursor.fetchone()
        if not trip_row:
            return jsonify({"error": "trip_not_found"}), 404

        route_id = trip_row["route_id"]
        capacity = trip_row["capacity"]

        # 3. Lấy thông tin fare
        cursor.execute("""
            SELECT route_id, seat_price
            FROM fare
            WHERE fare_id = %s
        """, (fare_id,))
        fare_row = cursor.fetchone()
        if not fare_row:
            return jsonify({"error": "fare_not_found"}), 404

        fare_route_id = fare_row["route_id"]
        seat_price    = fare_row["seat_price"]

        # Check route match
        if route_id != fare_route_id:
            return jsonify({"error": "fare_route_mismatch"}), 400

        # (Optional) Nếu bạn vẫn chỉ dùng số 1..capacity nhưng lưu string,
        # có thể check như này:
        invalid_seats = []
        for s in seat_codes:
            if s.isdigit():
                num = int(s)
                if num < 1 or num > capacity:
                    invalid_seats.append(s)
            else:
                # Nếu bạn cho phép mã kiểu "A01", bỏ check này hoặc custom thêm
                pass

        if invalid_seats:
            return jsonify({
                "error": "invalid_seat_code",
                "invalid_seats": invalid_seats
            }), 400

        # 4. Kiểm tra trùng ghế với ticket đang Issued/Used
        format_strings = ",".join(["%s"] * len(seat_codes))
        cursor.execute(f"""
            SELECT seat_code
            FROM ticket
            WHERE trip_id = %s
              AND seat_code IN ({format_strings})
              AND ticket_status IN ('Issued', 'Used')
        """, (trip_id, *seat_codes))
        taken_rows = cursor.fetchall()
        if taken_rows:
            taken = [r["seat_code"] for r in taken_rows]
            return jsonify({
                "error": "seat_already_taken",
                "taken_seats": taken
            }), 400

        # 5. Tạo booking (total_amount tạm = 0, sẽ cập nhật sau)
        cursor.execute("""
            INSERT INTO booking (currency, total_amount, account_id, operator_id)
            VALUES (%s, 0, %s, %s)
        """, (currency, account_id, operator_id))
        booking_id = cursor.lastrowid

        # 6. Tạo tickets
        ticket_ids = []
        for s in seat_codes:
            cursor.execute("""
                INSERT INTO ticket (
                    trip_id,
                    account_id,
                    booking_id,
                    fare_id,
                    qr_code_link,
                    ticket_status,
                    seat_price,
                    seat_code
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                trip_id,
                account_id,
                booking_id,
                fare_id,
                None,              # qr_code_link: tạm để None
                "Issued",
                seat_price,
                s                  # seat_code là VARCHAR
            ))
            ticket_ids.append(cursor.lastrowid)

        # Fetch serial numbers for the newly created tickets
        ticket_serials = []
        if ticket_ids:
            placeholders = ",".join(["%s"] * len(ticket_ids))
            cursor.execute(f"""
                SELECT ticket_id, serial_number
                FROM ticket
                WHERE ticket_id IN ({placeholders})
            """, tuple(ticket_ids))
            ticket_serials = [
                {"ticket_id": row["ticket_id"], "serial_number": row["serial_number"]}
                for row in cursor.fetchall()
            ]

        # 7. Cập nhật total_amount sử dụng fn_calculate_booking_total
        cursor.execute("""
            UPDATE booking
            SET total_amount = fn_calculate_booking_total(%s)
            WHERE booking_id = %s
        """, (booking_id, booking_id))

        conn.commit()

        return jsonify({
            "booking_id": booking_id,
            "ticket_ids": ticket_ids,
            "ticket_serials": ticket_serials,
            "seat_codes": seat_codes,
            "currency": currency
        }), 201

    except Exception as e:
        conn.rollback()
        print("Error in create_booking_with_multiple_tickets:", e)
        return jsonify({"error": "internal_server_error", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
