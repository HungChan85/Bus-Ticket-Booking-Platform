"""Profile routes for getting user account info and tickets"""

from flask import Blueprint, request, jsonify
from utils.database import db_connection

profile_bp = Blueprint('profile', __name__, url_prefix='/api/profile')

@profile_bp.route('/<int:account_id>', methods=['GET'])
def get_user_profile(account_id):
    """
    Get user account information by account_id
    
    Returns:
    {
        "success": true,
        "data": {
            "name": "...",
            "email": "...",
            "phone": "...",
            "dateOfBirth": "...",
            "govId": "...",
            "accountCreated": "...",
            "accountStatus": "..."
        }
    }
    """
    try:
        connection = db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Query to get account and person information
        query = """
            SELECT 
                a.account_id,
                a.email,
                a.phone,
                a.stat as account_status,
                a.create_at as account_created,
                p.person_name as name,
                p.date_of_birth,
                p.gov_id_num
            FROM account a
            LEFT JOIN person p ON a.account_id = p.account_id
            WHERE a.account_id = %s
        """
        
        cursor.execute(query, (account_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Format the response
        response_data = {
            'name': user['name'] or '',
            'email': user['email'] or '',
            'phone': str(user['phone']) or '',
            'dateOfBirth': user['date_of_birth'].strftime('%Y-%m-%d') if user['date_of_birth'] else '',
            'govId': str(user['gov_id_num']) if user['gov_id_num'] else '',
            'accountCreated': user['account_created'].strftime('%Y-%m-%d') if user['account_created'] else '',
            'accountStatus': user['account_status'] or 'Active'
        }
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'data': response_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching user profile: {str(e)}'
        }), 500


@profile_bp.route('/<int:account_id>/tickets', methods=['GET'])
def get_user_tickets(account_id):
    """
    Get all tickets purchased by a user
    
    Returns:
    {
        "success": true,
        "data": [
            {
                "ticketId": "...",
                "bookingId": "...",
                "tripId": ...,
                "route": "...",
                "departureDate": "...",
                "arrivalDate": "...",
                "seatCode": "...",
                "serialNumber": "...",
                "price": ...,
                "status": "...",
                "vehicleType": "...",
                "operator": "...",
                "plateNumber": "...",
                "bookingDate": "..."
            },
            ...
        ]
    }
    """
    try:
        connection = db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # Query to get all tickets with trip and booking information
        query = """
            SELECT 
                t.ticket_id,
                t.booking_id,
                t.trip_id,
                t.seat_code,
                t.serial_number,
                t.seat_price,
                t.ticket_status,
                tr.service_date,
                tr.arrival_datetime,
                tr.trip_status,
                b.vehicle_type,
                b.plate_number,
                bk.currency,
                bk.booking_status,
                o.brand_name as operator_brand,
                dep_station.city as departure_city,
                arr_station.city as arrival_city,
                DATE(bk.booking_id) as booking_date
            FROM ticket t
            INNER JOIN trip tr ON t.trip_id = tr.trip_id
            INNER JOIN booking bk ON t.booking_id = bk.booking_id
            INNER JOIN bus b ON tr.bus_id = b.bus_id
            INNER JOIN routetrip rt ON tr.route_id = rt.route_id
            INNER JOIN station dep_station ON rt.station_id = dep_station.station_id
            INNER JOIN station arr_station ON rt.arrival_station = arr_station.station_id
            INNER JOIN operator o ON bk.operator_id = o.operator_id
            WHERE t.account_id = %s
            ORDER BY tr.service_date DESC
        """
        
        cursor.execute(query, (account_id,))
        tickets = cursor.fetchall()
        
        # Format the response
        tickets_data = []
        for ticket in tickets:
            # Map trip_status to ticket status
            trip_status = ticket['trip_status']
            if trip_status == 'Cancelled':
                status = 'Cancelled'
            elif trip_status == 'Scheduled':
                status = 'Not Used'
            elif trip_status == 'Departed':
                status = 'In Use'
            elif trip_status == 'Arrived':
                status = 'Completed'
            else:
                status = 'Not Used'
            
            ticket_data = {
                'ticketId': f'TK{str(ticket["ticket_id"]).zfill(3)}',
                'bookingId': f'BK{str(ticket["booking_id"]).zfill(5)}',
                'tripId': ticket['trip_id'],
                'route': f"{ticket['departure_city']} → {ticket['arrival_city']}",
                'departureDate': ticket['service_date'].strftime('%Y-%m-%dT%H:%M:%S') if ticket['service_date'] else '',
                'arrivalDate': ticket['arrival_datetime'].strftime('%Y-%m-%dT%H:%M:%S') if ticket['arrival_datetime'] else '',
                'seatCode': ticket['seat_code'] or '',
                'serialNumber': str(ticket['serial_number']) if ticket['serial_number'] else '',
                'price': ticket['seat_price'] or 0,
                'status': status,
                'vehicleType': ticket['vehicle_type'] or '',
                'operator': ticket['operator_brand'] or '',
                'plateNumber': ticket['plate_number'] or ''
            }
            tickets_data.append(ticket_data)
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'success': True,
            'data': tickets_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching user tickets: {str(e)}'
        }), 500