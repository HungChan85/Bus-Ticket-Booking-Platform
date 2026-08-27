from flask import Blueprint, request, jsonify
from utils.database import db_connection
import datetime
from utils.jwt_helper import generate_token
import bcrypt

auth_bp = Blueprint("auth", __name__)

# Canonical roles for JWT
ROLE_MAP = {
    "passenger": "USER",
    "user": "USER",
    "staff": "STAFF",
    "admin": "ADMIN",
}


# --- Registration ---
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    role = data.get("role", "PASSENGER")

    full_name = data.get("full_name")
    email = data.get("email")
    phone = data.get("phone")
    password = data.get("password")
    gov_id = data.get("gov_id")
    dob = data.get("dob")

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8') if password else None

    conn = None
    cursor = None
    try:
        conn = db_connection()
        cursor = conn.cursor()

        if role == "PASSENGER":
            args = [full_name, dob, gov_id, email, phone, hashed_password, 0]
            result_args = cursor.callproc('sp_create_passenger_account', args)
            new_id = result_args[6]

            conn.commit()
            return jsonify({"success": True, "message": "Registration successful!", "userId": new_id}), 201

        elif role == "STAFF":
             hire_date = data.get("hire_date", datetime.date.today())
             operator_id = data.get("operator_id", "OP001")

             args = [full_name, dob, gov_id, email, phone, hashed_password, hire_date, operator_id, 0]
             result_args = cursor.callproc('sp_create_staff_account', args)
             new_id = result_args[8]

             conn.commit()
             return jsonify({"success": True, "message": "Staff registration successful!", "userId": new_id}), 201
        else:
            return jsonify({"success": False, "message": "Invalid role"}), 400

    except Exception as e:
        if conn: conn.rollback()
        print(f"Register Error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# --- Login ---
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "passenger").lower()

    conn = None
    cursor = None
    try:
        conn = db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT * FROM account WHERE email = %s",
            (email,)
        )
        account = cursor.fetchone()

        if not account or not password:
            return jsonify({"success": False, "message": "Incorrect email or password!"}), 401

        is_valid = False
        db_password = account.get('acc_password', '')
        if db_password.startswith('$2b$') or db_password.startswith('$2a$'):
            try:
                if bcrypt.checkpw(password.encode('utf-8'), db_password.encode('utf-8')):
                    is_valid = True
            except Exception:
                pass
        else:
            if db_password == password:
                is_valid = True

        if not is_valid:
            return jsonify({"success": False, "message": "Incorrect email or password!"}), 401

        account_id = account['account_id']

        # Check role mapping
        user_info = None
        if role == 'passenger':
            cursor.execute("""
                SELECT ps.passenger_id as id, p.person_name as name
                FROM passenger ps
                JOIN person p ON ps.person_id = p.person_id
                WHERE p.account_id = %s
            """, (account_id,))
            user_info = cursor.fetchone()
        elif role == 'staff':
            cursor.execute("""
                SELECT s.staff_id as id, p.person_name as name, s.operator_id
                FROM staff s
                JOIN person p ON s.person_id = p.person_id
                WHERE p.account_id = %s
            """, (account_id,))
            user_info = cursor.fetchone()
            # Thêm operator_id vào để dùng trong manage trips & routes
        elif role == 'admin':
            cursor.execute("""
                SELECT s.staff_id as id, p.person_name as name
                FROM staff s
                JOIN person p ON s.person_id = p.person_id
                WHERE p.account_id = %s
            """, (account_id,))
            user_info = cursor.fetchone()

        if not user_info:
            return jsonify({"success": False, "message": f"This account is not authorized as a {role.upper()}!"}), 403

        mapped_role = ROLE_MAP.get(role, role.upper())
        token_payload = {
            "account_id": account_id,
            "user_id": user_info["id"],
            "role": mapped_role,
            "name": user_info["name"],
            "email": email,
        }
        token = generate_token(token_payload)

        return jsonify({
            "success": True,
            "message": "Login successful!",
            "user": {
                "name": user_info['name'],
                "role": mapped_role,
                "id": user_info['id'],
                "accountId": account_id,
                "account_id": account_id  # Add for consistency
            },
            "token": token
        }), 200

    except Exception as e:
        print(f"Login Error: {e}")
        return jsonify({"success": False, "message": "System Error"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
