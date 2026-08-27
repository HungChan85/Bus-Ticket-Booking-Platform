from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, date
import re
from utils.database import db_connection
import datetime
from utils.jwt_helper import token_required


admin_bp = Blueprint("admin", __name__)


@admin_bp.before_request
def require_admin_auth():
    # Allow preflight requests without auth
    if request.method == "OPTIONS":
        return None
    # Use the decorator machinery with a no-op function
    check = token_required({"ADMIN"})
    result = check(lambda: None)()
    return result



def is_valid_email(email: str) -> bool:
    """Basic email syntax validation using regex."""
    if not email or len(email) > 254:
        return False
    pattern = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
    return bool(pattern.match(email))



@admin_bp.route("/stations", methods=["GET"])
def get_stations():
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM station")
        result = cursor.fetchall()
        return jsonify(result)
    finally:
        cursor.close()
        conn.close()
@admin_bp.route("/stations", methods=["POST"])
def post_stations():

    data = request.get_json(silent=True) or {}
    station_data = [
        "city",
        "station_name",
        "province",
        "address_station",
        "operator_id",
        "active_flag",
        "latitude",
        "longtitude",
    ]

    missing = [f for f in station_data if data.get(f) in (None, "")]
    if missing:
        return jsonify({"error": "missing_fields", "fields": missing}), 400
        
    city = str(data.get("city")).strip()
    active_flag = str(data.get("active_flag")).strip()
    if active_flag not in ("Active", "Inactive", "Maintenance"):
        return jsonify({"error": "invalid_active_flag", "field": "active_flag"}), 400
    station_name = str(data.get("station_name")).strip()
    try:
        latitude = float(data["latitude"])
        longtitude = float(data["longtitude"])
    except (TypeError, ValueError):
        return jsonify({"error": "invalid_coordinates", "fields": ["latitude", "longtitude"]}), 400
    province = str(data.get("province")).strip()
    address_station = str(data.get("address_station")).strip()


    operator_id = str(data.get("operator_id")).strip()

    
    conn = db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT 1 FROM operator WHERE operator_id=%s", (operator_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "operator_not_found", "field": "operator_id"}), 404
        cursor.execute(
            "insert into station(city,active_flag,station_name,latitude,longtitude,province,address_station,operator_id) values (%s,%s, %s, %s, %s,%s,%s,%s)",
            (city, active_flag, station_name, latitude, longtitude, province, address_station, operator_id),
        )
        conn.commit()

        return jsonify({
            "status": "created",
            "station": {
                "city": city,
                "active_flag": active_flag,
                "station_name": station_name,
                "latitude": latitude,
                "longtitude": longtitude,
                "province": province,
                "address_station": address_station,
                "operator_id": operator_id,
            }
        }), 201
    except Exception as exc:
        conn.rollback()
        return jsonify({"error": "db_error", "message": str(exc)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/stations/<int:station_id>", methods=["PATCH"])
def update_station(station_id):
    data = request.get_json(silent=True) or {}

    # Các field cho phép update
    allowed_fields = [
        "city",
        "station_name",
        "province",
        "address_station",
        "operator_id",
        "active_flag",
        "latitude",
        "longtitude",
    ]

    # Kiểm tra có gửi field hợp lệ hay không
    update_fields = {k: v for k, v in data.items() if k in allowed_fields}
    if not update_fields:
        return jsonify({"error": "no_valid_fields"}), 400

    # Validate active_flag nếu có
    if "active_flag" in update_fields:
        active_flag = str(update_fields["active_flag"]).strip()
        if active_flag not in ("Active", "Inactive", "Maintenance"):
            return jsonify({"error": "invalid_active_flag", "value": active_flag}), 400
        update_fields["active_flag"] = active_flag

    # Validate operator_id nếu có
    if "operator_id" in update_fields:
        update_fields["operator_id"] = str(update_fields["operator_id"]).strip()

    conn = db_connection()
    cursor = conn.cursor()
    try:
        # Check station tồn tại
        cursor.execute("SELECT 1 FROM station WHERE station_id=%s", (station_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "station_not_found"}), 404

        # Check operator_id tồn tại
        if "operator_id" in update_fields:
            cursor.execute("SELECT 1 FROM operator WHERE operator_id=%s",
                           (update_fields["operator_id"],))
            if cursor.fetchone() is None:
                return jsonify({"error": "operator_not_found"}), 404

        # Build câu UPDATE động
        set_clause = ", ".join(f"{k}=%s" for k in update_fields.keys())
        values = list(update_fields.values()) + [station_id]

        cursor.execute(
            f"UPDATE station SET {set_clause} WHERE station_id=%s",
            values
        )
        conn.commit()

        return jsonify({
            "status": "updated",
            "station_id": station_id,
            "updated_fields": update_fields
        }), 200

    except Exception as exc:
        conn.rollback()
        return jsonify({"error": "db_error", "message": str(exc)}), 500

    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/stations/<int:station_id>", methods=["DELETE"])
def del_stations(station_id):
    conn = db_connection()
    cursor = conn.cursor()
    try:
        # Kiểm tra station có tồn tại
        cursor.execute("SELECT 1 FROM station where station_id = %s ",(station_id,))
        if cursor.fetchone() is None:
            return jsonify({"error":"Station is not exist"}), 404
        
        cursor.execute("DELETE FROM station WHERE (station_id = %s);",(station_id,))
        conn.commit()
        return jsonify({
            "status":"deleted complete"
        }), 200
    except Exception as exc:
        conn.rollback()
        return jsonify({"error": "db_error", "message": str(exc)}), 500

    finally:
        cursor.close()
        conn.close()


@admin_bp.route("/operators", methods=["GET"])
def get_operators():
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM operator")
        result = cursor.fetchall()
        return jsonify(result)
    finally:
        cursor.close()
        conn.close()
@admin_bp.route("/operators", methods=["POST"])
def add_operator():
    data = request.get_json(silent=True) or {}

    required = ["legal_name", "brand_name", "brand_email", "tax_id"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify({"error": "missing_fields", "fields": missing}), 400

    legal_name = str(data.get("legal_name")).strip()
    brand_name = str(data.get("brand_name")).strip()
    brand_email = str(data.get("brand_email")).strip().lower()
    tax_id = str(data.get("tax_id")).strip()

    if not is_valid_email(brand_email):
        return jsonify({"error": "invalid_email", "field": "brand_email"}), 400

    conn = db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO operator(legal_name,brand_name,brand_email,tax_id) VALUES (%s, %s, %s, %s)",
            (legal_name, brand_name, brand_email, tax_id)
        )
        conn.commit()
        operator_id = cursor.lastrowid
        return jsonify({
            "status": "created",
            "operator": {
                "operator_id": operator_id,
                "legal_name": legal_name,
                "brand_name": brand_name,
                "brand_email": brand_email,
                "tax_id": tax_id
                
            }
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": "db_error", "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/passengers", methods=["GET"])
def get_customers():
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT p.*,c.passenger_id FROM person p join passenger c on p.person_id = c.passenger_id") 
        result = cursor.fetchall()
        return jsonify(result)
    finally:
        cursor.close()
        conn.close()
@admin_bp.route("/passengers/<int:passenger_id>/account-info", methods=["GET"])
def get_cus_acc_info(passenger_id):
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT 1 FROM passenger where passenger_id = %s",(passenger_id,))
        if cursor.fetchone() is None:
            return jsonify({"error":"Passenger_not_found"}),404
        cursor.execute("SELECT person_id from passenger where passenger_id = %s", (passenger_id,))
        row = cursor.fetchone()
        if row is None:
            return jsonify({"error":"person_link_missing"}),404
        target_person_id = row["person_id"]
        
        cursor.execute("Select account_id from person where person_id = %s",(target_person_id,))
        row = cursor.fetchone()
        target_acc_id = row["account_id"]
        
        cursor.execute("select email, phone ,stat, create_at from account where account_id = %s",(target_acc_id,))
        result = cursor.fetchone()
        return jsonify(result),200
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/passengers/<int:passenger_id>/account-status", methods=["PATCH"])
def update_passenger_account_status(passenger_id):
    data = request.get_json(silent=True) or {}
    new_status = str(data.get("status")).strip()

    allowed = {"Active", "Inactive", "Suspended"}
    if new_status not in allowed:
        return jsonify({
            "error": "invalid_status",
            "allowed": sorted(list(allowed))
        }), 400

    conn = db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT 1 FROM passenger WHERE passenger_id = %s", (passenger_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "passenger_not_found"}), 404

        cursor.execute("SELECT person_id FROM passenger WHERE passenger_id = %s", (passenger_id,))
        row = cursor.fetchone()
        if row is None:
            return jsonify({"error": "person_link_missing"}), 404
        person_id = row[0]

        cursor.execute("SELECT account_id FROM person WHERE person_id = %s", (person_id,))
        row = cursor.fetchone()
        if row is None:
            return jsonify({"error": "account_link_missing"}), 404
        account_id = row[0]

        cursor.execute("UPDATE account SET stat = %s WHERE account_id = %s", (new_status, account_id))
        conn.commit()
        return jsonify({
            "status": "updated",
            "account_id": account_id,
            "new_status": new_status
        }), 200
    except Exception as exc:
        conn.rollback()
        return jsonify({"error": "db_error", "message": str(exc)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/staffs", methods=["GET"])
def get_staffs():
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT p.*,s.staff_id FROM person p join staff s on p.person_id = s.staff_id")
        result = cursor.fetchall()
        return jsonify(result)
    finally:
        cursor.close()
        conn.close()
@admin_bp.route("/staffs/<int:staff_id>/account-info", methods=["GET"])
def get_staff_acc_info(staff_id):
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT 1 FROM staff where staff_id = %s",(staff_id,))
        if cursor.fetchone() is None:
            return jsonify({"error":"Staff_not_found"}),404
        cursor.execute("SELECT person_id from staff where staff_id = %s", (staff_id,))
        row = cursor.fetchone()
        if row is None:
            return jsonify({"error":"person_link_missing"}),404
        target_person_id = row["person_id"]
        
        cursor.execute("Select account_id from person where person_id = %s",(target_person_id,))
        row = cursor.fetchone()
        target_acc_id = row["account_id"]
        
        cursor.execute("select email, phone ,stat, create_at from account where account_id = %s",(target_acc_id,))
        result = cursor.fetchone()
        return jsonify(result),200
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/staffs/<int:staff_id>/account-status", methods=["PATCH"])
def update_staff_account_status(staff_id):
    data = request.get_json(silent=True) or {}
    new_status = str(data.get("status")).strip()



    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT 1 FROM staff WHERE staff_id = %s", (staff_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "staff_not_found"}), 404

        cursor.execute("SELECT person_id FROM staff WHERE staff_id = %s", (staff_id,))
        row = cursor.fetchone()
        if row is None:
            return jsonify({"error": "person_link_missing"}), 404
        person_id = row["person_id"]

        cursor.execute("SELECT account_id FROM person WHERE person_id = %s", (person_id,))
        row = cursor.fetchone()
        if row is None:
            return jsonify({"error": "account_link_missing"}), 404
        account_id = row["account_id"]

        cursor.execute("UPDATE account SET stat = %s WHERE account_id = %s", (new_status, account_id))
        conn.commit()
        return jsonify({
            "status": "updated",
            "account_id": account_id,
            "new_status": new_status
        }), 200
    except Exception as exc:
        conn.rollback()
        return jsonify({"error": "db_error", "message": str(exc)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/operators/<string:operator_id>", methods=["DELETE"])
def del_operators(operator_id):
    conn = db_connection()
    cursor = conn.cursor()
    try:
        # Kiểm tra station có tồn tại
        cursor.execute("SELECT 1 FROM operator where operator_id = %s ",(operator_id,))
        if cursor.fetchone() is None:
            return jsonify({"error":"Station is not exist"}), 404
        
        cursor.execute("DELETE FROM operator WHERE (operator_id = %s);",(operator_id,))
        conn.commit()
        return jsonify({
            "status":"deleted complete"
        }), 200
    except Exception as exc:
        conn.rollback()
        return jsonify({"error": "db_error", "message": str(exc)}), 500

    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/trips", methods=["GET"])
def get_trips():
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM trip")
        result = cursor.fetchall()
        return jsonify(result)
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/trips", methods=["POST"])
def add_trips():
    data = request.get_json(silent=True) or {}

    required = ["service_date","bus_id","route_id"]
    missing = [k for k in required if not data.get(k)]
    if missing:
        return jsonify({"error": "missing_fields", "fields": missing}), 400

    service_date = str(data.get("service_date")).strip()
    bus_id = str(data.get("bus_id")).strip()
    route_id = str(data.get("route_id")).strip().lower()
    

    conn = db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "CALL sp_schedule_trip(%s,%s,%s, @trip_id)",
            (service_date,bus_id,route_id)
        )
        conn.commit()
        return jsonify({
            "status": "created",
            "New Trip": {
                "Service date": service_date,
                "Bus": bus_id,
                "Route": route_id
            }
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": "db_error", "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()    

@admin_bp.route("/trips/<int:trip_id>", methods=["PATCH"])
def patch_trip(trip_id):
    data = request.get_json() or {}

    allowed_status = {"Scheduled", "Departed", "Arrived", "Cancelled"}

    trip_status       = data.get("trip_status")
    service_date_str  = data.get("service_date")

    updates = {}
    values  = []

    # Validate & prepare trip_status
    if trip_status is not None:
        if trip_status not in allowed_status:
            return jsonify({
                "error": "invalid_trip_status",
                "allowed": list(allowed_status)
            }), 400
        updates["trip_status"] = trip_status

    # Validate & prepare service_date
    if service_date_str is not None:
        try:
            service_dt = datetime.fromisoformat(service_date_str.replace("T", " "))
        except ValueError:
            return jsonify({
                "error": "invalid_service_date_format",
                "expected": "YYYY-MM-DD HH:MM:SS or ISO 8601"
            }), 400
        updates["service_date"] = service_dt.strftime("%Y-%m-%d %H:%M:%S")

    if not updates:
        return jsonify({"error": "no_valid_fields"}), 400

    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check trip tồn tại
        cursor.execute("SELECT trip_id FROM trip WHERE trip_id = %s", (trip_id,))
        if not cursor.fetchone():
            return jsonify({"error": "trip_not_found"}), 404

        # Build câu UPDATE linh hoạt
        set_clauses = []
        for col, val in updates.items():
            set_clauses.append(f"{col} = %s")
            values.append(val)

        values.append(trip_id)

        sql = f"UPDATE trip SET {', '.join(set_clauses)} WHERE trip_id = %s"
        cursor.execute(sql, tuple(values))
        conn.commit()

        # Trigger BEFORE UPDATE sẽ tự tính lại arrival_datetime nếu service_date đổi

        # Trả về trip đã cập nhật
        cursor.execute("""
            SELECT trip_id, trip_status, service_date, arrival_datetime,
                   bus_id, route_id
            FROM trip
            WHERE trip_id = %s
        """, (trip_id,))
        trip = cursor.fetchone()

        return jsonify(trip), 200

    except Exception as e:
        print("Error in patch_trip:", e)
        return jsonify({"error": "internal_server_error", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
@admin_bp.route("/trips/<int:trip_id>", methods=["DELETE"])
def del_trip(trip_id):
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check xem trip co ton tai
        cursor.execute("SELECT 1 from trip where (trip_id = %s)", (trip_id,))
        if cursor.fetchone() is None:
            return jsonify({"error":"Trip_not_found"}), 404
        
        cursor.execute("DELETE FROM trip WHERE (trip_id = %s)", (trip_id,))
        conn.commit()
        return jsonify({"status":"Trip deletetd succesfully"}),200
    except Exception as exc:
        conn.rollback()
        return jsonify({"error": "db_error", "message": str(exc)}), 500
    finally: 
        cursor.close()
        conn.close()



# Trả về danh sách chổ còn trống 
@admin_bp.route("/trips/<int:trip_id>/seats", methods=["GET"])
def get_trip_seats(trip_id):
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Lấy capacity của bus cho trip này
        cursor.execute("""
            SELECT b.capacity
            FROM trip t
            JOIN bus b ON t.bus_id = b.bus_id
            WHERE t.trip_id = %s
        """, (trip_id,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "trip_not_found"}), 404

        capacity = row["capacity"]

        # 2. Lấy danh sách ghế đã được dùng (Issued / Used)
        cursor.execute("""
            SELECT seat_code
            FROM ticket
            WHERE trip_id = %s
              AND ticket_status IN ('Issued', 'Used')
        """, (trip_id,))
        taken_seats = [r["seat_code"] for r in cursor.fetchall()]  # giờ là string

        # 3. Tính danh sách ghế còn trống
        # Giả định seat_code là "1","2",...,"capacity"
        all_seats = [str(i) for i in range(1, capacity + 1)]
        available_seats = [s for s in all_seats if s not in taken_seats]

        return jsonify({
            "trip_id": trip_id,
            "capacity": capacity,
            "taken_seats": taken_seats,
            "available_seats": available_seats
        })
    except Exception as e:
        print("Error in get_trip_seats:", e)
        return jsonify({"error": "internal_server_error", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/routes", methods=["GET"])
def get_route():
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM defaultdb.routetrip")
        result = cursor.fetchall()
        for i in result:
            if isinstance(i.get("default_duration_time"), (datetime.time, datetime.timedelta)):
                i["default_duration_time"] = str(i["default_duration_time"])
        return jsonify(result)
    finally:
        cursor.close()
        conn.close()



@admin_bp.route("/routes", methods=["POST"])
def create_route():
    data = request.get_json()

    # Lấy dữ liệu từ body
    time_str = data.get("default_duration_time")   # VD: "01:30:00" hoặc "01:30"
    distance = data.get("distance")
    station_id = data.get("station_id")
    operator_id = data.get("operator_id")
    arrival_station = data.get("arrival_station")

    # Validate sơ sơ
    if not all([time_str, distance, station_id, operator_id]):
        return jsonify({"error": "missing_field"}), 400

    # Chuẩn hóa format time: nếu client gửi "HH:MM" thì thêm ":00"
    if len(time_str) == 5:  # "HH:MM"
        time_str = time_str + ":00"

    # (không bắt buộc) kiểm tra format time
    try:
        # Nếu parse được thì format ổn
        datetime.datetime.strptime(time_str, "%H:%M:%S")
    except ValueError:
        return jsonify({"error": "invalid_time_format", "expected": "HH:MM:SS"}), 400

    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Insert vào routetrip
        sql = """
            INSERT INTO routetrip (default_duration_time, distance, station_id, operator_id,arrival_station)
            VALUES (%s, %s, %s, %s,%s)
        """
        cursor.execute(sql, (time_str, distance, station_id, operator_id,arrival_station))
        conn.commit()

        new_id = cursor.lastrowid

        return jsonify({
            "route_id": new_id,
            "default_duration_time": time_str,
            "distance": distance,
            "station_id": station_id,
            "arrival_station": arrival_station,
            "operator_id": operator_id
        }), 201

    except Exception as e:
        current_app.logger.exception(e)
        return jsonify({"error": "internal_server_error", "details": str(e)}), 500

    finally:
        cursor.close()
        conn.close()
@admin_bp.route("/routes/<int:route_id>", methods=["PATCH"])
def update_route(route_id):
    data = request.get_json(silent=True) or {}

    allowed_fields = {"default_duration_time", "distance", "station_id", "operator_id", "arrival_station"}
    updates = {k: v for k, v in data.items() if k in allowed_fields and v is not None}

    if not updates:
        return jsonify({"error": "no_valid_fields"}), 400

    # Chuẩn hóa và validate thời gian nếu có
    if "default_duration_time" in updates:
        time_str = str(updates["default_duration_time"]).strip()
        if len(time_str) == 5:  # "HH:MM"
            time_str = time_str + ":00"
        try:
            datetime.datetime.strptime(time_str, "%H:%M:%S")
        except ValueError:
            return jsonify({"error": "invalid_time_format", "expected": "HH:MM:SS"}), 400
        updates["default_duration_time"] = time_str


    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check route tồn tại
        cursor.execute("SELECT 1 FROM routetrip WHERE route_id = %s", (route_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "route_not_found"}), 404

        # (Tuỳ chọn) Kiểm tra khoá ngoại nếu có gửi kèm
        if "station_id" in updates:
            cursor.execute("SELECT 1 FROM station WHERE station_id = %s", (updates["station_id"],))
            if cursor.fetchone() is None:
                return jsonify({"error": "station_not_found"}), 404
        if "operator_id" in updates:
            cursor.execute("SELECT 1 FROM operator WHERE operator_id = %s", (updates["operator_id"],))
            if cursor.fetchone() is None:
                return jsonify({"error": "operator_not_found"}), 404

        set_clause = ", ".join(f"{k} = %s" for k in updates.keys())
        values = list(updates.values()) + [route_id]
        cursor.execute(f"UPDATE routetrip SET {set_clause} WHERE route_id = %s", values)
        conn.commit()

        # Trả về bản ghi đã cập nhật
        cursor.execute("SELECT * FROM routetrip WHERE route_id = %s", (route_id,))
        route = cursor.fetchone()
        if route and isinstance(route.get("default_duration_time"), (datetime.time, datetime.timedelta)):
            route["default_duration_time"] = str(route["default_duration_time"])

        return jsonify({
            "status": "updated",
            "route_id": route_id,
            "updated_fields": list(updates.keys()),
            "route": route
        }), 200

    except Exception as e:
        conn.rollback()
        current_app.logger.exception(e)
        return jsonify({"error": "internal_server_error", "details": str(e)}), 500

    finally:
        cursor.close()
        conn.close()
@admin_bp.route("/routes/<int:route_id>", methods=["DELETE"])
def del_route(route_id):
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check xem route co ton tai
        cursor.execute("SELECT 1 from routetrip where (route_id = %s)", (route_id,))
        if cursor.fetchone() is None:
            return jsonify({"error":"Route_not_found"}), 404
        
        cursor.execute("DELETE FROM routetrip WHERE (route_id = %s)", (route_id,))
        conn.commit()
        return jsonify({"status":"route deletetd succesfully"}),200
    except Exception as exc:
        conn.rollback()
        return jsonify({"error": "db_error", "message": str(exc)}), 500
    finally: 
        cursor.close()
        conn.close()

@admin_bp.route("/bookings", methods=["GET"])
def get_bookings():
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM booking")
        result = cursor.fetchall()
        return jsonify(result)
    finally:
        cursor.close()
        conn.close()
@admin_bp.route("/bookings", methods=["POST"])
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

@admin_bp.route("/bookings/<int:booking_id>", methods=["PATCH"])
def patch_booking(booking_id):
    data = request.get_json() or {}

    allowed_fields = {"booking_status", "admin_note"}
    updates = {k: v for k, v in data.items() if k in allowed_fields}

    if not updates:
        return jsonify({"error": "no_valid_fields"}), 400

    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check booking tồn tại
        cursor.execute("SELECT booking_id FROM booking WHERE booking_id = %s", (booking_id,))
        if not cursor.fetchone():
            return jsonify({"error": "booking_not_found"}), 404

        # Build câu UPDATE linh hoạt
        set_clauses = []
        values = []
        for key, value in updates.items():
            set_clauses.append(f"{key} = %s")
            values.append(value)

        values.append(booking_id)

        sql = f"UPDATE booking SET {', '.join(set_clauses)} WHERE booking_id = %s"
        cursor.execute(sql, tuple(values))
        conn.commit()

        return jsonify({"booking_id": booking_id, "updated_fields": list(updates.keys())}), 200

    except Exception as e:
        print("Error in patch_booking:", e)
        return jsonify({"error": "internal_server_error", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/bookings/<int:booking_id>", methods=["DELETE"])
def del_booking(booking_id):
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check xem route co ton tai
        cursor.execute("SELECT 1 from booking where (booking_id = %s)", (booking_id,))
        if cursor.fetchone() is None:
            return jsonify({"error":"Booking_not_found"}), 404
        
        cursor.execute("DELETE FROM booking WHERE (booking_id = %s)", (booking_id,))
        conn.commit()
        return jsonify({"status":"booking deletetd succesfully"}),200
    except Exception as exc:
        conn.rollback()
        return jsonify({"error": "db_error", "message": str(exc)}), 500
    finally: 
        cursor.close()
        conn.close()



@admin_bp.route("/buses", methods=["GET"])
def get_buses():
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM bus")
        result = cursor.fetchall()
        return jsonify(result)
    finally:
        cursor.close()
        conn.close()
@admin_bp.route("/buses", methods=["POST"])
def create_bus():
    data = request.get_json() or {}
    plate_number = data.get("plate_number")
    bus_active_flag = data.get("bus_active_flag")
    capacity = data.get("capacity")
    vehicle_type = data.get("vehicle_type")
    operator_id = data.get("operator_id")

    type_allowed = ["Sleeper","Seater","Limousine"]
    if vehicle_type not in type_allowed:
        return jsonify({"error": "vehicle_type_not_allowed"}) 
    if capacity > 60:
        return jsonify({"error":"capacity_to_large"})
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)


    try:
        cursor.execute("INSERT INTO bus(plate_number,bus_active_flag,capacity,vehicle_type,operator_id) VALUES(%s,%s,%s,%s,%s)",(plate_number,bus_active_flag,capacity,vehicle_type,operator_id))
        conn.commit()
        return jsonify({
            "Status":"Inserted new bus",
            "Plate number" : plate_number,
            "Bus status" : bus_active_flag,
            "Capacity": capacity,
            "Type" : vehicle_type,
            "Operator" : operator_id
        })
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/buses/<int:bus_id>", methods=["PATCH"])
def update_bus(bus_id):
    data = request.get_json(silent=True) or {}

    allowed_fields = {"bus_active_flag", "capacity"}
    updates = {k: v for k, v in data.items() if k in allowed_fields}
    if not updates:
        return jsonify({"error": "no_valid_fields"}), 400


    # Validate capacity if provided
    if "capacity" in updates:
        try:
            cap = int(updates["capacity"])
        except (TypeError, ValueError):
            return jsonify({"error": "invalid_capacity"}), 400
        if cap < 1 or cap > 60:
            return jsonify({"error": "capacity_out_of_range", "min": 1, "max": 60}), 400
        updates["capacity"] = cap

    # Validate/normalize bus_active_flag if provided (optional policy)
    if "bus_active_flag" in updates:
        flag = str(updates["bus_active_flag"]).strip()
        flag_allowed = {"Active", "Inactive", "Maintenance"}
        if flag not in flag_allowed:
            return jsonify({"error": "invalid_bus_active_flag", "allowed": sorted(list(flag_allowed))}), 400
        updates["bus_active_flag"] = flag

    conn = db_connection()
    cursor = conn.cursor()
    try:
        # Ensure bus exists
        cursor.execute("SELECT 1 FROM bus WHERE bus_id = %s", (bus_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "bus_not_found"}), 404
        
        set_clause = ", ".join(f"{k}=%s" for k in updates.keys())
        values = list(updates.values()) + [bus_id]
        cursor.execute(f"UPDATE bus SET {set_clause} WHERE bus_id = %s", values)
        conn.commit()

        return jsonify({
            "status": "updated",
            "bus_id": bus_id,
            "updated_fields": list(updates.keys())
        }), 200
    except Exception as exc:
        conn.rollback()
        return jsonify({"error": "db_error", "message": str(exc)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/buses/<int:bus_id>", methods=["DELETE"])
def delete_bus(bus_id):
    conn = db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT 1 FROM bus WHERE bus_id = %s", (bus_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "bus_not_found"}), 404

        cursor.execute("DELETE FROM bus WHERE bus_id = %s", (bus_id,))
        conn.commit()
        return jsonify({"status": "deleted", "bus_id": bus_id}), 200
    except Exception as exc:
        conn.rollback()
        return jsonify({"error": "db_error", "message": str(exc)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/fares", methods=["GET"])
def get_fares():
    route_id = request.args.get("route_id", type=int)

    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if route_id is not None:
            cursor.execute("""
                SELECT fare_id, currency, discount, valid_from, valid_to,
                       taxes, route_id, surcharges, base_fare, seat_price, seat_class
                FROM fare
                WHERE route_id = %s
                ORDER BY valid_from DESC
            """, (route_id,))
        else:
            cursor.execute("""
                SELECT fare_id, currency, discount, valid_from, valid_to,
                       taxes, route_id, surcharges, base_fare, seat_price, seat_class
                FROM fare
                ORDER BY valid_from DESC
            """)
        fares = cursor.fetchall()
        return jsonify(fares), 200
    except Exception as e:
        print("Error in get_fares:", e)
        return jsonify({"error": "internal_server_error", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/fares/<int:fare_id>", methods=["GET"])
def get_fare_detail(fare_id):
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT fare_id, currency, discount, valid_from, valid_to,
                   taxes, route_id, surcharges, base_fare, seat_price, seat_class
            FROM fare
            WHERE fare_id = %s
        """, (fare_id,))
        fare = cursor.fetchone()
        if not fare:
            return jsonify({"error": "fare_not_found"}), 404
        return jsonify(fare), 200
    except Exception as e:
        print("Error in get_fare_detail:", e)
        return jsonify({"error": "internal_server_error", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
@admin_bp.route("/fares", methods=["POST"])
def create_fare():
    data = request.get_json(silent=True) or {}

    currency   = data.get("currency")
    discount   = data.get("discount")
    valid_from = data.get("valid_from")
    valid_to   = data.get("valid_to")
    taxes      = data.get("taxes")
    route_id   = data.get("route_id")
    surcharges = data.get("surcharges")
    base_fare  = data.get("base_fare")
    seat_price = data.get("seat_price")
    seat_class = data.get("seat_class")

    # Validate cơ bản
    required_fields = {
        "currency": currency,
        "valid_from": valid_from,
        "valid_to": valid_to,
        "route_id": route_id,
        "base_fare": base_fare,
        "seat_price": seat_price,
        "seat_class": seat_class,
    }
    missing = [k for k, v in required_fields.items() if v in (None, "")]
    if missing:
        return jsonify({"error": "missing_fields", "fields": missing}), 400

    # Chuẩn hoá/validate kiểu dữ liệu
    try:
        route_id_int   = int(route_id)
        base_fare_val  = float(base_fare)
        seat_price_val = float(seat_price)
        discount_val   = float(discount) if discount is not None else 0.0
        taxes_val      = float(taxes) if taxes is not None else 0.0
        surcharges_val = float(surcharges) if surcharges is not None else 0.0
    except (TypeError, ValueError):
        return jsonify({"error": "invalid_numeric_values"}), 400

    # Optional: validate seat_class
    allowed_classes = {"VIP", "Standard", "Economy"}
    if str(seat_class) not in allowed_classes:
        return jsonify({"error": "invalid_seat_class", "allowed": sorted(list(allowed_classes))}), 400


    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Kiểm tra route tồn tại
        cursor.execute("SELECT 1 FROM routetrip WHERE route_id = %s", (route_id_int,))
        if cursor.fetchone() is None:
            return jsonify({"error": "route_not_found"}), 404

        # Thực hiện insert
        cursor.execute(
            """
            INSERT INTO fare (
                currency, discount, valid_from, valid_to, taxes,
                route_id, surcharges, base_fare, seat_price, seat_class
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                currency,
                discount_val,
                valid_from,
                valid_to,
                taxes_val,
                route_id_int,
                surcharges_val,
                base_fare_val,
                seat_price_val,
                seat_class,
            ),
        )
        conn.commit()

        fare_id = cursor.lastrowid

        # Lấy lại fare vừa tạo
        cursor.execute(
            """
            SELECT fare_id, currency, discount, valid_from, valid_to,
                   taxes, route_id, surcharges, base_fare, seat_price, seat_class
            FROM fare
            WHERE fare_id = %s
            """,
            (fare_id,),
        )
        fare = cursor.fetchone()

        return jsonify(fare), 201

    except Exception as e:
        conn.rollback()
        current_app.logger.exception(e)
        return jsonify({"error": "internal_server_error", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/fares/<int:fare_id>", methods=["PATCH"])
def patch_fare(fare_id):
    data = request.get_json(silent=True) or {}

    allowed_fields = {
        "currency",
        "discount",
        "valid_from",
        "valid_to",
        "taxes",
        "route_id",
        "surcharges",
        "base_fare",
        "seat_price",
        "seat_class",
    }

    updates = {k: v for k, v in data.items() if k in allowed_fields}
    if not updates:
        return jsonify({"error": "no_valid_fields"}), 400

    # Validate and normalize numeric fields if present
    try:
        if "route_id" in updates and updates["route_id"] is not None:
            updates["route_id"] = int(updates["route_id"])
        if "base_fare" in updates and updates["base_fare"] is not None:
            updates["base_fare"] = float(updates["base_fare"])
        if "seat_price" in updates and updates["seat_price"] is not None:
            updates["seat_price"] = float(updates["seat_price"])
        if "discount" in updates and updates["discount"] is not None:
            updates["discount"] = float(updates["discount"])
        if "taxes" in updates and updates["taxes"] is not None:
            updates["taxes"] = float(updates["taxes"])
        if "surcharges" in updates and updates["surcharges"] is not None:
            updates["surcharges"] = float(updates["surcharges"])
    except (TypeError, ValueError):
        return jsonify({"error": "invalid_numeric_values"}), 400

    # Validate seat_class if present (mirror POST policy)
    if "seat_class" in updates and updates["seat_class"] is not None:
        allowed_classes = {"VIP", "Standard", "Economy"}
        if str(updates["seat_class"]) not in allowed_classes:
            return jsonify({
                "error": "invalid_seat_class",
                "allowed": sorted(list(allowed_classes))
            }), 400


    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Ensure fare exists
        cursor.execute("SELECT 1 FROM fare WHERE fare_id = %s", (fare_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "fare_not_found"}), 404

        # If updating route_id, ensure referenced route exists
        if "route_id" in updates:
            cursor.execute("SELECT 1 FROM routetrip WHERE route_id = %s", (updates["route_id"],))
            if cursor.fetchone() is None:
                return jsonify({"error": "route_not_found"}), 404

        set_clause = ", ".join(f"{k} = %s" for k in updates.keys())
        values = list(updates.values()) + [fare_id]
        cursor.execute(f"UPDATE fare SET {set_clause} WHERE fare_id = %s", values)
        conn.commit()

        cursor.execute(
            """
            SELECT fare_id, currency, discount, valid_from, valid_to,
                   taxes, route_id, surcharges, base_fare, seat_price, seat_class
            FROM fare
            WHERE fare_id = %s
            """,
            (fare_id,),
        )
        fare = cursor.fetchone()

        return jsonify({
            "status": "updated",
            "fare_id": fare_id,
            "updated_fields": list(updates.keys()),
            "fare": fare,
        }), 200

    except Exception as e:
        conn.rollback()
        current_app.logger.exception(e)
        return jsonify({"error": "internal_server_error", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/tickets", methods=["GET"])
def get_tickets():
    account_id = request.args.get("account_id", type=int)
    trip_id    = request.args.get("trip_id", type=int)
    booking_id = request.args.get("booking_id", type=int)
    status     = request.args.get("status")  # Issued, Used, Refunded, Cancelled

    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        base_sql = """
            SELECT
                ticket_id,
                trip_id,
                account_id,
                booking_id,
                fare_id,
                qr_code_link,
                ticket_status,
                seat_price,
                seat_code,
                serial_number
            FROM ticket
            WHERE 1=1
        """
        params = []

        if account_id is not None:
            base_sql += " AND account_id = %s"
            params.append(account_id)
        if trip_id is not None:
            base_sql += " AND trip_id = %s"
            params.append(trip_id)
        if booking_id is not None:
            base_sql += " AND booking_id = %s"
            params.append(booking_id)
        if status is not None:
            base_sql += " AND ticket_status = %s"
            params.append(status)

        base_sql += " ORDER BY ticket_id DESC"

        cursor.execute(base_sql, tuple(params))
        tickets = cursor.fetchall()
        return jsonify(tickets), 200

    except Exception as e:
        print("Error in get_tickets:", e)
        return jsonify({"error": "internal_server_error", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route("/tickets/<int:ticket_id>", methods=["GET"])
def get_ticket_detail(ticket_id):
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT
                tk.ticket_id,
                tk.trip_id,
                tk.account_id,
                tk.booking_id,
                tk.fare_id,
                tk.qr_code_link,
                tk.ticket_status,
                tk.seat_price,
                tk.seat_code,
                tk.serial_number,
                t.service_date,
                t.arrival_datetime,
                t.route_id,
                t.bus_id
            FROM ticket tk
            JOIN trip t ON tk.trip_id = t.trip_id
            WHERE tk.ticket_id = %s
        """, (ticket_id,))
        ticket = cursor.fetchone()
        if not ticket:
            return jsonify({"error": "ticket_not_found"}), 404

        return jsonify(ticket), 200

    except Exception as e:
        print("Error in get_ticket_detail:", e)
        return jsonify({"error": "internal_server_error", "details": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
@admin_bp.route("/tickets/<int:ticket_id>/refund", methods=["POST"])
def refund_ticket(ticket_id):
    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Gọi stored procedure
        cursor.execute("CALL sp_refund_ticket(%s)", (ticket_id,))

        # Nếu SP ném SIGNAL SQLSTATE '45000', mysql-connector sẽ raise exception,
        # bạn có thể catch để trả lỗi đẹp hơn.
        # Nhưng ở đây mình để chung trong except.

        # Lấy lại info ticket sau khi refund
        cursor.execute("""
            SELECT
                ticket_id,
                trip_id,
                account_id,
                booking_id,
                fare_id,
                qr_code_link,
                ticket_status,
                seat_price,
                seat_code,
                serial_number
            FROM ticket
            WHERE ticket_id = %s
        """, (ticket_id,))
        ticket = cursor.fetchone()

        if not ticket:
            # Thực ra nếu ticket không tồn tại, SP đã báo lỗi rồi.
            return jsonify({"error": "ticket_not_found"}), 404

        return jsonify({
            "message": "ticket_refunded",
            "ticket": ticket
        }), 200

    except Exception as e:
        # Nếu SP bắn SIGNAL '45000', message sẽ nằm trong e
        print("Error in refund_ticket:", e)
        return jsonify({"error": "refund_failed", "details": str(e)}), 400
    finally:
        cursor.close()
        conn.close()
@admin_bp.route("/tickets/<int:ticket_id>", methods=["PATCH"])
def patch_ticket(ticket_id):
    data = request.get_json(silent=True) or {}
    new_status = str(data.get("ticket_status", "")).strip()

    allowed = {"Issued", "Used", "Refunded", "Cancelled"}
    if new_status not in allowed:
        return jsonify({
            "error": "invalid_status",
            "allowed": list(allowed)
        }), 400

    conn = db_connection()
    cursor = conn.cursor()
    try:
        # Check ticket exists
        cursor.execute("SELECT 1 FROM ticket WHERE ticket_id = %s", (ticket_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "ticket_not_found"}), 404

        # Update status
        cursor.execute(
            "UPDATE ticket SET ticket_status=%s WHERE ticket_id=%s",
            (new_status, ticket_id)
        )
        conn.commit()

        return jsonify({
            "status": "updated",
            "ticket_id": ticket_id,
            "ticket_status": new_status
        }), 200

    except Exception as exc:
        conn.rollback()
        return jsonify({
            "error": "db_error",
            "details": str(exc)
        }), 500
    finally:
        cursor.close()
        conn.close()

@admin_bp.route("/bookings/<int:booking_id>/tickets", methods=["POST"])
def add_ticket_to_booking(booking_id):
    data = request.get_json(silent=True) or {}

    trip_id = data.get("trip_id")
    fare_id = data.get("fare_id")
    seat_codes = data.get("seat_codes")  # must be list of seat codes

    if not trip_id or not fare_id or not seat_codes:
        return jsonify({
            "error": "missing_fields",
            "required": ["trip_id", "fare_id", "seat_codes"]
        }), 400

    if not isinstance(seat_codes, list) or len(seat_codes) == 0:
        return jsonify({"error": "seat_codes_must_be_list"}), 400

    conn = db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Check booking exists + get account_id
        cursor.execute(
            "SELECT booking_id, account_id FROM booking WHERE booking_id=%s",
            (booking_id,)
        )
        booking = cursor.fetchone()
        if not booking:
            return jsonify({"error": "booking_not_found"}), 404

        account_id = booking["account_id"]

        # Check trip exists
        cursor.execute("SELECT 1 FROM trip WHERE trip_id=%s", (trip_id,))
        if cursor.fetchone() is None:
            return jsonify({"error": "trip_not_found"}), 404

        # Check fare exists + get seat_price
        cursor.execute(
            "SELECT fare_id, seat_price FROM fare WHERE fare_id=%s",
            (fare_id,)
        )
        fare = cursor.fetchone()
        if not fare:
            return jsonify({"error": "fare_not_found"}), 404

        seat_price = fare["seat_price"]

        # Insert new tickets
        created_ids = []
        for seat in seat_codes:
            cursor.execute("""
                INSERT INTO ticket (trip_id, account_id, booking_id, fare_id, 
                                    ticket_status, seat_price, seat_code)
                VALUES (%s, %s, %s, %s, 'Issued', %s, %s)
            """, (trip_id, account_id, booking_id, fare_id, seat_price, seat))
            created_ids.append(cursor.lastrowid)

        conn.commit()

        return jsonify({
            "status": "created",
            "booking_id": booking_id,
            "tickets_created": created_ids
        }), 201

    except Exception as exc:
        conn.rollback()
        return jsonify({
            "error": "db_error",
            "details": str(exc)
        }), 500

    finally:
        cursor.close()
        conn.close()

__all__ = ["admin_bp"]
