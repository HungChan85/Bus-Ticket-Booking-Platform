"""Ticket routes for Page 4 - Ticket Lookup"""

from flask import Blueprint, request, jsonify
from utils.database import db_connection

ticket_bp = Blueprint('ticket', __name__, url_prefix='/api/tickets')

@ticket_bp.route('/lookup', methods=['POST'])
def lookup_ticket():
    """
    Tra cứu thông tin vé thông qua serial number và số điện thoại
    Page 4 requirement
    """
    try:
        data = request.get_json()
        serial_number = data.get('serial_number')
        phone = data.get('phone')
        if not serial_number or not phone:
            return jsonify({
                'success': False,
                'message': 'Vui lòng cung cấp đầy đủ mã vé và số điện thoại'
            }), 400

        

        conn = db_connection()
        cursor = conn.cursor(dictionary=True)

        # Query ticket information with all related data
        query = """
            SELECT
                t.ticket_id,
                t.serial_number,
                t.seat_code,
                t.seat_price,
                t.ticket_status,
                t.qr_code_link,
                tr.trip_id,
                tr.service_date,
                tr.trip_status,
                rt.route_id,
                rt.distance,
                rt.default_duration_time,
                b.plate_number,
                b.vehicle_type,
                b.capacity,
                a.phone,
                a.email,
                s1.station_name as departure_station,
                s1.city as departure_city,
                s1.province as departure_province
            FROM ticket t
            INNER JOIN trip tr ON t.trip_id = tr.trip_id
            INNER JOIN routetrip rt ON tr.route_id = rt.route_id
            INNER JOIN bus b ON tr.bus_id = b.bus_id
            INNER JOIN account a ON t.account_id = a.account_id
            INNER JOIN station s1 ON rt.station_id = s1.station_id
            WHERE t.serial_number = %s AND a.phone = %s
        """

        cursor.execute(query, (serial_number, phone))
        rows = cursor.fetchall()

        if not rows:
            return jsonify({
                'success': False,
                'phone': phone,
                'serial_number':serial_number,
                'message': 'Không tìm thấy vé với mã vé và số điện thoại này'
            }), 404

        # If multiple rows match (unlikely), return the first
        row = rows[0]

        # Format response
        response = {
            'success': True,
            'data': {
                'ticket_id': row['ticket_id'],
                'serial_number': row['serial_number'],
                'seat_code': row['seat_code'],
                'seat_price': row['seat_price'],
                'ticket_status': row['ticket_status'],
                'qr_code_link': row['qr_code_link'],
                'trip': {
                    'trip_id': row['trip_id'],
                    'service_date': row['service_date'].isoformat() if row['service_date'] else None,
                    'trip_status': row['trip_status']
                },
                'route': {
                    'route_id': row['route_id'],
                    'distance': row['distance'],
                    'default_duration_time': str(row['default_duration_time']) if row['default_duration_time'] else None,
                    'departure_station': row['departure_station'],
                    'departure_city': row['departure_city'],
                    'departure_province': row['departure_province']
                },
                'bus': {
                    'plate_number': row['plate_number'],
                    'vehicle_type': row['vehicle_type'],
                    'capacity': row['capacity']
                },
                'account': {
                    'phone': row['phone'],
                    'email': row['email']
                }
            }
        }

        return jsonify(response), 200

    except Exception as e:
        print(f"Error in lookup_ticket: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Lỗi server khi tra cứu vé',
            'error': str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()