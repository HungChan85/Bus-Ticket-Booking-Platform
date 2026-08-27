"""Booking routes for creating bookings and tickets"""

from flask import Blueprint, request, jsonify
from utils.database import db_connection
import json

booking_bp = Blueprint('booking', __name__, url_prefix='/api/bookings')

@booking_bp.route('/create', methods=['POST'])
def create_booking_with_tickets():
    """
    Tạo booking và tickets sử dụng stored procedure sp_create_booking_with_tickets
    
    Request body:
    {
        "currency": "VND",
        "account_id": 1,
        "operator_id": "OP001",
        "trip_id": 123,
        "fare_id": 45,
        "seat_list": ["A1", "A2"],
        "qr_code_link": "https://example.com/qr/xxx" (optional)
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['currency', 'account_id', 'operator_id', 'trip_id', 'fare_id', 'seat_list']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        currency = data.get('currency')
        account_id = data.get('account_id')
        operator_id = data.get('operator_id')
        trip_id = data.get('trip_id')
        fare_id = data.get('fare_id')
        seat_list = data.get('seat_list')  # List of seat codes
        qr_code_link = data.get('qr_code_link', None)
        
        # Validate seat_list is a list
        if not isinstance(seat_list, list) or len(seat_list) == 0:
            return jsonify({
                'success': False,
                'message': 'seat_list must be a non-empty array'
            }), 400
        
        conn = db_connection()
        cursor = conn.cursor()
        
        # Convert seat_list to JSON string for MySQL
        seat_list_json = json.dumps(seat_list)
        
        # Call stored procedure
        cursor.callproc('sp_create_booking_with_tickets', [
            currency,
            account_id,
            operator_id,
            trip_id,
            fare_id,
            seat_list_json,
            qr_code_link,
            0  # OUT parameter placeholder
        ])
        
        # Get the OUT parameter (booking_id)
        cursor.execute("SELECT @_sp_create_booking_with_tickets_7 AS booking_id")
        result = cursor.fetchone()
        booking_id = result[0] if result else None
        
        conn.commit()
        
        if booking_id:
            # Fetch booking details
            cursor.execute("""
                SELECT 
                    b.booking_id,
                    b.currency,
                    b.total_amount,
                    b.booking_status,
                    b.account_id,
                    b.operator_id,
                    COUNT(t.ticket_id) as ticket_count
                FROM booking b
                LEFT JOIN ticket t ON b.booking_id = t.booking_id
                WHERE b.booking_id = %s
                GROUP BY b.booking_id
            """, (booking_id,))
            
            booking_row = cursor.fetchone()
            
            if booking_row:
                response = {
                    'success': True,
                    'message': 'Booking created successfully',
                    'data': {
                        'booking_id': booking_row[0],
                        'currency': booking_row[1],
                        'total_amount': booking_row[2],
                        'booking_status': booking_row[3],
                        'account_id': booking_row[4],
                        'operator_id': booking_row[5],
                        'ticket_count': booking_row[6]
                    }
                }
                return jsonify(response), 201
        
        return jsonify({
            'success': False,
            'message': 'Failed to create booking'
        }), 500
        
    except Exception as e:
        error_message = str(e)
        print(f"Error in create_booking_with_tickets: {error_message}")
        
        # Check for specific MySQL errors
        if 'Not enough available seats' in error_message:
            return jsonify({
                'success': False,
                'message': 'Không đủ ghế trống cho chuyến xe này'
            }), 400
        elif 'Seat already taken' in error_message:
            return jsonify({
                'success': False,
                'message': 'Ghế đã được đặt bởi người khác'
            }), 400
        elif 'does not exist' in error_message:
            return jsonify({
                'success': False,
                'message': 'Thông tin chuyến xe hoặc giá vé không hợp lệ'
            }), 400
        else:
            return jsonify({
                'success': False,
                'message': 'Lỗi server khi tạo booking',
                'error': error_message
            }), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


@booking_bp.route('/<int:booking_id>', methods=['GET'])
def get_booking_details(booking_id):
    """
    Lấy thông tin chi tiết của một booking
    """
    try:
        conn = db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get booking info with tickets
        cursor.execute("""
            SELECT 
                b.booking_id,
                b.currency,
                b.total_amount,
                b.booking_status,
                b.account_id,
                b.operator_id,
                b.admin_note
            FROM booking b
            WHERE b.booking_id = %s
        """, (booking_id,))
        
        booking = cursor.fetchone()
        
        if not booking:
            return jsonify({
                'success': False,
                'message': 'Booking not found'
            }), 404
        
        # Get tickets for this booking
        cursor.execute("""
            SELECT 
                t.ticket_id,
                t.serial_number,
                t.seat_code,
                t.seat_price,
                t.ticket_status,
                t.qr_code_link,
                t.trip_id,
                t.fare_id
            FROM ticket t
            WHERE t.booking_id = %s
        """, (booking_id,))
        
        tickets = cursor.fetchall()
        
        response = {
            'success': True,
            'data': {
                'booking': booking,
                'tickets': tickets
            }
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error in get_booking_details: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Lỗi server khi lấy thông tin booking',
            'error': str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()
