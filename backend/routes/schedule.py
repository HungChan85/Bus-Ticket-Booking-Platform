from datetime import datetime, timedelta, time
from flask import Blueprint, jsonify, request
from utils.database import db_connection, dict_row
from utils.bookings import create_booking

schedule_bp = Blueprint("schedule", __name__)


def _format_time(value):
    if isinstance(value, datetime):
        return value.strftime("%H:%M")
    return ""


def _format_duration(value):
    if isinstance(value, time):
        value = timedelta(hours=value.hour, minutes=value.minute, seconds=value.second)
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
    cursor = conn.cursor(row_factory=dict_row)
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
    cursor = conn.cursor(row_factory=dict_row)
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
    cursor = conn.cursor(row_factory=dict_row)
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
    try:
        booking_id, ticket_serials = create_booking(
            conn, currency, account_id, operator_id, trip_id, fare_id, seat_codes
        )
        conn.commit()
        return jsonify({
            "booking_id": booking_id,
            "ticket_ids": [ticket["ticket_id"] for ticket in ticket_serials],
            "ticket_serials": ticket_serials,
            "seat_codes": seat_codes,
            "currency": currency,
        }), 201
    except Exception as exc:
        conn.rollback()
        status = 400 if getattr(exc, "sqlstate", None) in ("P0001", "23505", "23503") else 500
        return jsonify({"error": "booking_failed", "details": str(exc).splitlines()[0]}), status
    finally:
        conn.close()
