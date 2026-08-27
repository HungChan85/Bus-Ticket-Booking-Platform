from datetime import date, datetime, time as dt_time, timedelta

from flask import Blueprint, request, jsonify

from utils.database import db_connection

trips_bp = Blueprint("trips", __name__)


def _format_datetime_value(raw_value):
    """Convert date/datetime objects to consistent strings for JSON responses."""
    if raw_value is None:
        return None
    if isinstance(raw_value, datetime):
        return raw_value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(raw_value, date):
        combined = datetime.combine(raw_value, datetime.min.time())
        return combined.strftime("%Y-%m-%d %H:%M:%S")
    return str(raw_value)


def _extract_duration_parts(duration_value):
    """Return (hours, minutes) regardless of TIME/timedelta representation."""
    if duration_value is None:
        return None
    if isinstance(duration_value, timedelta):
        total_minutes = int(duration_value.total_seconds() // 60)
        return divmod(total_minutes, 60)
    if isinstance(duration_value, dt_time):
        return duration_value.hour, duration_value.minute
    if isinstance(duration_value, str):
        try:
            parts = duration_value.split(":")
            if len(parts) >= 2:
                return int(parts[0]), int(parts[1])
        except ValueError:
            return None
    return None


def _format_duration_label(duration_value):
    parts = _extract_duration_parts(duration_value)
    if not parts:
        return "N/A"
    hours, minutes = parts
    if minutes == 0:
        return f"{hours}h"
    return f"{hours}h {minutes}m"


@trips_bp.route("", methods=["GET"])
def get_trips():
    """Get all trips with route, bus, and operator information"""
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get optional filters
        filter_date = request.args.get("date")
        filter_status = request.args.get("status")
        
        query = """
            SELECT 
                t.trip_id,
                t.service_date,
                t.arrival_datetime,
                t.trip_status,
                t.bus_id,
                t.route_id,
                b.plate_number AS bus_plate,
                b.vehicle_type AS bus_type,
                b.capacity AS bus_capacity,
                rt.distance,
                rt.default_duration_time,
                rt.operator_id,
                o.brand_name AS operator_name,
                ds.city AS departure_city,
                ds.station_name AS departure_station,
                das.city AS arrival_city,
                das.station_name AS arrival_station,
                fn_get_available_seats(t.trip_id) AS available_seats
            FROM trip t
            INNER JOIN bus b ON t.bus_id = b.bus_id
            INNER JOIN routetrip rt ON t.route_id = rt.route_id
            INNER JOIN operator o ON rt.operator_id = o.operator_id
            INNER JOIN station ds ON rt.station_id = ds.station_id
            INNER JOIN station das ON rt.arrival_station = das.station_id
        """
        
        conditions = []
        params = []
        
        if filter_date:
            conditions.append("DATE(t.service_date) = %s")
            params.append(filter_date)
        
        if filter_status and filter_status != "all":
            conditions.append("t.trip_status = %s")
            params.append(filter_status)
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        query += " ORDER BY t.service_date DESC"
        
        cursor.execute(query, params)
        trips = cursor.fetchall()
        
        # Format data for frontend
        formatted_trips = []
        for trip in trips:
            service_date_str = _format_datetime_value(trip["service_date"])
            arrival_str = _format_datetime_value(trip["arrival_datetime"])
            formatted_trip = {
                "trip_id": trip["trip_id"],
                "service_date": service_date_str,
                "arrival_datetime": arrival_str,
                "trip_status": trip["trip_status"],
                "bus_id": trip["bus_id"],
                "route_id": trip["route_id"],
                "bus_plate": trip["bus_plate"],
                "bus_type": trip["bus_type"],
                "bus_capacity": trip["bus_capacity"],
                "distance": float(trip["distance"]) if trip["distance"] else None,
                "operator_id": trip["operator_id"],
                "operator_name": trip["operator_name"],
                "departure_city": trip["departure_city"],
                "departure_station": trip["departure_station"],
                "arrival_city": trip["arrival_city"],
                "arrival_station": trip["arrival_station"],
                "available_seats": trip["available_seats"] if trip["available_seats"] is not None else 0,
                "route_name": f"{trip['departure_city']} -> {trip['arrival_city']}"
            }
            
            formatted_trip["duration"] = _format_duration_label(trip.get("default_duration_time"))
            
            formatted_trips.append(formatted_trip)
        
        return jsonify({"data": formatted_trips}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@trips_bp.route("", methods=["POST"])
def create_trip():
    """Create a new trip using sp_schedule_trip stored procedure"""
    data = request.get_json(silent=True) or {}
    
    required_fields = ["service_date", "bus_id", "route_id"]
    missing = [field for field in required_fields if not data.get(field)]
    
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
    
    service_date = data.get("service_date")
    bus_id = data.get("bus_id")
    route_id = data.get("route_id")
    
    # Validate and parse service_date
    try:
        # Expected format: "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM"
        if "T" in service_date:
            service_date_obj = datetime.fromisoformat(service_date.replace("Z", ""))
        else:
            service_date_obj = datetime.strptime(service_date, "%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid service_date format. Use YYYY-MM-DD HH:MM:SS or ISO format"}), 400
    
    conn = db_connection()
    cursor = conn.cursor()
    try:
        # Check if bus exists and is active
        cursor.execute("SELECT bus_id, bus_active_flag FROM bus WHERE bus_id = %s", (bus_id,))
        bus = cursor.fetchone()
        if not bus:
            return jsonify({"error": "Bus not found"}), 404
        if bus[1] != "Active":
            return jsonify({"error": f"Bus is not active. Current status: {bus[1]}"}), 400
        
        # Check if route exists
        cursor.execute("SELECT route_id FROM routetrip WHERE route_id = %s", (route_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "Route not found"}), 404
        
        # Call stored procedure to schedule trip
        cursor.execute("SET @trip_id = NULL")
        cursor.execute("""
            CALL sp_schedule_trip(%s, %s, %s, @trip_id)
        """, (service_date_obj, bus_id, route_id))
        
        # Get the output trip_id
        cursor.execute("SELECT @trip_id AS trip_id")
        result = cursor.fetchone()
        trip_id = result[0] if result else None
        
        conn.commit()
        
        return jsonify({
            "message": "Trip scheduled successfully",
            "trip_id": trip_id
        }), 201
        
    except Exception as e:
        conn.rollback()
        error_msg = str(e)
        # Handle specific stored procedure errors
        if "already has a trip scheduled" in error_msg:
            return jsonify({"error": "Bus is already scheduled for another trip at this time"}), 409
        return jsonify({"error": error_msg}), 500
    finally:
        cursor.close()
        conn.close()


@trips_bp.route("/<int:trip_id>", methods=["PATCH"])
def update_trip(trip_id):
    """Update trip status or other fields"""
    data = request.get_json(silent=True) or {}
    
    allowed_fields = ["trip_status", "service_date", "arrival_datetime"]
    update_fields = {k: v for k, v in data.items() if k in allowed_fields}
    
    if not update_fields:
        return jsonify({"error": "No valid fields to update"}), 400
    
    # Validate trip_status if provided
    if "trip_status" in update_fields:
        valid_statuses = ["Scheduled", "Departed", "Arrived", "Cancelled"]
        if update_fields["trip_status"] not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400
    
    conn = db_connection()
    cursor = conn.cursor()
    try:
        # Check if trip exists
        cursor.execute("SELECT trip_id, trip_status FROM trip WHERE trip_id = %s", (trip_id,))
        trip = cursor.fetchone()
        if not trip:
            return jsonify({"error": "Trip not found"}), 404
        
        current_status = trip[1]
        
        # Prevent updating completed trips
        if current_status in ["Arrived", "Cancelled"] and "trip_status" not in update_fields:
            return jsonify({"error": f"Cannot modify trip with status: {current_status}"}), 400
        
        # Build update query
        set_clauses = []
        values = []
        
        for field, value in update_fields.items():
            set_clauses.append(f"{field} = %s")
            values.append(value)
        
        values.append(trip_id)
        
        update_query = f"UPDATE trip SET {', '.join(set_clauses)} WHERE trip_id = %s"
        cursor.execute(update_query, values)
        conn.commit()
        
        return jsonify({"message": "Trip updated successfully"}), 200
        
    except Exception as e:
        conn.rollback()
        error_msg = str(e)
        # Handle trigger validation errors
        if "Cannot cancel trip" in error_msg:
            return jsonify({"error": "Cannot cancel trip with confirmed tickets"}), 409
        return jsonify({"error": error_msg}), 500
    finally:
        cursor.close()
        conn.close()


@trips_bp.route("/<int:trip_id>", methods=["DELETE"])
def delete_trip(trip_id):
    """Cancel a trip (sets status to Cancelled rather than deleting)"""
    conn = db_connection()
    cursor = conn.cursor()
    try:
        # Check if trip exists
        cursor.execute("SELECT trip_id, trip_status FROM trip WHERE trip_id = %s", (trip_id,))
        trip = cursor.fetchone()
        if not trip:
            return jsonify({"error": "Trip not found"}), 404
        
        current_status = trip[1]
        
        # Check if trip can be cancelled
        if current_status in ["Arrived", "Cancelled"]:
            return jsonify({"error": f"Cannot cancel trip with status: {current_status}"}), 400
        
        # Check if there are confirmed tickets
        cursor.execute(
            """
            SELECT COUNT(*) as ticket_count 
            FROM ticket 
            WHERE trip_id = %s AND ticket_status = 'Issued'
        """,
            (trip_id,),
        )
        result = cursor.fetchone()
        ticket_count = result[0] if result else 0
        
        if ticket_count > 0:
            return jsonify({
                "error": f"Cannot cancel trip. There are {ticket_count} confirmed ticket(s).",
                "ticket_count": ticket_count
            }), 409
        
        # Update status to Cancelled instead of deleting
        cursor.execute("UPDATE trip SET trip_status = 'Cancelled' WHERE trip_id = %s", (trip_id,))
        conn.commit()
        
        return jsonify({"message": "Trip cancelled successfully"}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@trips_bp.route("/<int:trip_id>/booked-seats", methods=["GET"])
def get_booked_seats(trip_id):
    """Get booked seats for a trip - simple endpoint for seat selector"""
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if trip exists
        cursor.execute("SELECT trip_id FROM trip WHERE trip_id = %s", (trip_id,))
        if cursor.rowcount == 0:
            return jsonify({"error": "Trip not found"}), 404
        
        # Get booked seats
        cursor.execute(
            """
            SELECT seat_code 
            FROM ticket 
            WHERE trip_id = %s AND ticket_status IN ('Issued', 'Used')
            ORDER BY seat_code
        """,
            (trip_id,),
        )
        booked_seats = [row["seat_code"] for row in cursor.fetchall()]
        
        return jsonify({
            "trip_id": trip_id,
            "booked_seats": booked_seats
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@trips_bp.route("/<int:trip_id>/seats", methods=["GET"])
def get_trip_seats(trip_id):
    """Get available seats for a trip"""
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if trip exists
        cursor.execute("SELECT trip_id FROM trip WHERE trip_id = %s", (trip_id,))
        if cursor.rowcount == 0:
            return jsonify({"error": "Trip not found"}), 404
        
        # Get available seats using function
        cursor.execute("SELECT fn_get_available_seats(%s) AS available_seats", (trip_id,))
        result = cursor.fetchone()
        available_seats = result["available_seats"] if result else 0
        
        # Get bus capacity
        cursor.execute("""
            SELECT b.capacity 
            FROM trip t 
            INNER JOIN bus b ON t.bus_id = b.bus_id 
            WHERE t.trip_id = %s
        """, (trip_id,))
        capacity_result = cursor.fetchone()
        total_capacity = capacity_result["capacity"] if capacity_result else 0
        
        # Get booked seats
        cursor.execute(
            """
            SELECT seat_code 
            FROM ticket 
            WHERE trip_id = %s AND ticket_status IN ('Issued', 'Used')
            ORDER BY seat_code
        """,
            (trip_id,),
        )
        booked_seats = [row["seat_code"] for row in cursor.fetchall()]
        
        return jsonify({
            "trip_id": trip_id,
            "total_capacity": total_capacity,
            "available_seats": available_seats,
            "booked_seats": booked_seats,
            "occupancy_rate": round(((total_capacity - available_seats) / total_capacity * 100), 2) if total_capacity > 0 else 0
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@trips_bp.route("/buses/active", methods=["GET"])
def get_active_buses():
    """Get all active buses - public endpoint for trip scheduling"""
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                bus_id,
                plate_number,
                bus_active_flag,
                capacity,
                vehicle_type
            FROM bus
            WHERE bus_active_flag = 'Active'
            ORDER BY vehicle_type, plate_number
        """)
        buses = cursor.fetchall()
        return jsonify(buses), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


__all__ = ["trips_bp"]
