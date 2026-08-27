from datetime import time as dt_time, timedelta

from flask import Blueprint, request, jsonify

from utils.database import db_connection

routes_bp = Blueprint("routes", __name__)


def _format_duration_value(duration_value):
    """Normalize MySQL TIME/timedelta results to HH:MM:SS strings."""
    if duration_value is None:
        return None
    if isinstance(duration_value, timedelta):
        total_minutes = int(duration_value.total_seconds() // 60)
        hours, minutes = divmod(total_minutes, 60)
        return f"{hours:02d}:{minutes:02d}:00"
    if isinstance(duration_value, dt_time):
        return duration_value.strftime("%H:%M:%S")
    if isinstance(duration_value, str):
        parts = duration_value.split(":")
        if len(parts) == 2:
            return f"{parts[0].zfill(2)}:{parts[1].zfill(2)}:00"
        if len(parts) == 3:
            return f"{parts[0].zfill(2)}:{parts[1].zfill(2)}:{parts[2].zfill(2)}"
    # Fallback so jsonify never sees raw datetime objects
    return str(duration_value)


@routes_bp.route("", methods=["GET"])
def get_routes():
    """Get all routes with station and operator information"""
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT 
                rt.route_id,
                rt.distance,
                rt.default_duration_time,
                rt.operator_id,
                o.brand_name AS operator_name,
                ds.station_id AS departure_station_id,
                ds.city AS departure_city,
                ds.station_name AS departure_station,
                das.station_id AS arrival_station_id,
                das.city AS arrival_city,
                das.station_name AS arrival_station,
                COALESCE(MIN(f.seat_price), 0) AS price
            FROM routetrip rt
            INNER JOIN operator o ON rt.operator_id = o.operator_id
            INNER JOIN station ds ON rt.station_id = ds.station_id
            INNER JOIN station das ON rt.arrival_station = das.station_id
            LEFT JOIN fare f ON rt.route_id = f.route_id AND f.valid_to >= CURDATE()
            GROUP BY rt.route_id, rt.distance, rt.default_duration_time, rt.operator_id,
                     o.brand_name, ds.station_id, ds.city, ds.station_name,
                     das.station_id, das.city, das.station_name
            ORDER BY rt.route_id DESC
        """
        cursor.execute(query)
        routes = cursor.fetchall()
        
        # Format duration time for each route, regardless of driver return type
        for route in routes:
            normalized = _format_duration_value(route.get("default_duration_time"))
            if normalized is not None:
                route["default_duration_time"] = normalized
        
        return jsonify({"data": routes}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@routes_bp.route("", methods=["POST"])
def create_route():
    """Create a new route"""
    data = request.get_json(silent=True) or {}
    
    required_fields = ["departure_station_id", "arrival_station_id", "distance", "default_duration_time", "operator_id"]
    missing = [field for field in required_fields if not data.get(field)]
    
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
    
    departure_station_id = data.get("departure_station_id")
    arrival_station_id = data.get("arrival_station_id")
    distance = data.get("distance")
    default_duration_time = data.get("default_duration_time")
    operator_id = data.get("operator_id")
    price = data.get("price")
    
    # Validate departure and arrival stations are different
    if departure_station_id == arrival_station_id:
        return jsonify({"error": "Departure and arrival stations must be different"}), 400
    
    # Validate distance is positive
    try:
        distance = float(distance)
        if distance <= 0:
            return jsonify({"error": "Distance must be greater than 0"}), 400
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid distance value"}), 400
    
    # Validate price if provided
    if price is not None:
        try:
            price = int(price)
            if price < 0:
                return jsonify({"error": "Price must be a positive number"}), 400
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid price value"}), 400
    
    conn = db_connection()
    cursor = conn.cursor()
    try:
        # Check if stations exist
        cursor.execute(
            "SELECT station_id FROM station WHERE station_id IN (%s, %s)",
            (departure_station_id, arrival_station_id),
        )
        stations = cursor.fetchall()
        if len(stations) != 2:
            return jsonify({"error": "One or both stations do not exist"}), 404
        
        # Check if operator exists
        cursor.execute("SELECT operator_id FROM operator WHERE operator_id = %s", (operator_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "Operator does not exist"}), 404
        
        # Check if route already exists
        cursor.execute(
            """
            SELECT route_id FROM routetrip 
            WHERE station_id = %s AND arrival_station = %s AND operator_id = %s
        """,
            (departure_station_id, arrival_station_id, operator_id),
        )
        existing_route = cursor.fetchone()
        
        if existing_route:
            return jsonify({"error": "Route already exists for this operator"}), 409
        
        # Insert new route
        insert_query = """
            INSERT INTO routetrip (station_id, arrival_station, distance, default_duration_time, operator_id)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (departure_station_id, arrival_station_id, distance, default_duration_time, operator_id))
        route_id = cursor.lastrowid
        
        # Create fare entry if price is provided
        if price is not None:
            from datetime import date, timedelta
            valid_from = date.today()
            valid_to = valid_from + timedelta(days=365)  # Valid for 1 year
            
            fare_query = """
                INSERT INTO fare (currency, discount, valid_from, valid_to, taxes, route_id, 
                                  surcharges, base_fare, seat_price, seat_class)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(fare_query, (
                'VND', 0, valid_from, valid_to, 0, route_id, 0, price, price, 'Standard'
            ))
        
        conn.commit()
        return jsonify({"message": "Route created successfully", "route_id": route_id}), 201
        
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@routes_bp.route("/<int:route_id>", methods=["PATCH"])
def update_route(route_id):
    """Update an existing route"""
    data = request.get_json(silent=True) or {}
    
    allowed_fields = ["departure_station_id", "arrival_station_id", "distance", "default_duration_time", "operator_id", "price"]
    update_fields = {k: v for k, v in data.items() if k in allowed_fields}
    
    if not update_fields:
        return jsonify({"error": "No valid fields to update"}), 400
    
    conn = db_connection()
    cursor = conn.cursor()
    try:
        # Check if route exists
        cursor.execute("SELECT route_id FROM routetrip WHERE route_id = %s", (route_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "Route not found"}), 404
        
        # Validate distance if provided
        if "distance" in update_fields:
            try:
                distance = float(update_fields["distance"])
                if distance <= 0:
                    return jsonify({"error": "Distance must be greater than 0"}), 400
                update_fields["distance"] = distance
            except (TypeError, ValueError):
                return jsonify({"error": "Invalid distance value"}), 400
        
        # Validate price if provided
        price = None
        if "price" in update_fields:
            try:
                price = int(update_fields["price"])
                if price < 0:
                    return jsonify({"error": "Price must be a positive number"}), 400
                # Remove from route update fields as it's handled separately
                del update_fields["price"]
            except (TypeError, ValueError):
                return jsonify({"error": "Invalid price value"}), 400
        
        # Build update query
        set_clauses = []
        values = []
        
        field_mapping = {
            "departure_station_id": "station_id",
            "arrival_station_id": "arrival_station",
            "distance": "distance",
            "default_duration_time": "default_duration_time",
            "operator_id": "operator_id",
        }
        
        for field, db_column in field_mapping.items():
            if field in update_fields:
                set_clauses.append(f"{db_column} = %s")
                values.append(update_fields[field])
        
        values.append(route_id)
        
        if set_clauses:
            update_query = f"UPDATE routetrip SET {', '.join(set_clauses)} WHERE route_id = %s"
            cursor.execute(update_query, values)
        
        # Update fare entries if price is provided
        if price is not None:
            # Update all fare entries for this route
            fare_update_query = """
                UPDATE fare 
                SET seat_price = %s, base_fare = %s
                WHERE route_id = %s
            """
            cursor.execute(fare_update_query, (price, price, route_id))
            
            # If no fare entries exist, create one
            cursor.execute("SELECT COUNT(*) FROM fare WHERE route_id = %s", (route_id,))
            fare_count = cursor.fetchone()[0]
            
            if fare_count == 0:
                from datetime import date, timedelta
                valid_from = date.today()
                valid_to = valid_from + timedelta(days=365)
                
                fare_insert_query = """
                    INSERT INTO fare (currency, discount, valid_from, valid_to, taxes, route_id,
                                      surcharges, base_fare, seat_price, seat_class)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(fare_insert_query, (
                    'VND', 0, valid_from, valid_to, 0, route_id, 0, price, price, 'Standard'
                ))
        
        conn.commit()
        return jsonify({"message": "Route updated successfully"}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@routes_bp.route("/<int:route_id>", methods=["DELETE"])
def delete_route(route_id):
    """Delete a route (only if no trips exist)"""
    conn = db_connection()
    cursor = conn.cursor()
    try:
        # Check if route exists
        cursor.execute("SELECT route_id FROM routetrip WHERE route_id = %s", (route_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "Route not found"}), 404
        
        # Check if there are any trips using this route
        cursor.execute("SELECT COUNT(*) as trip_count FROM trip WHERE route_id = %s", (route_id,))
        result = cursor.fetchone()
        trip_count = result[0] if result else 0
        
        if trip_count > 0:
            return jsonify({
                "error": f"Cannot delete route. There are {trip_count} trip(s) using this route.",
                "trip_count": trip_count
            }), 409
        
        # Delete the route
        cursor.execute("DELETE FROM routetrip WHERE route_id = %s", (route_id,))
        conn.commit()
        
        return jsonify({"message": "Route deleted successfully"}), 200
        
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


__all__ = ["routes_bp"]
