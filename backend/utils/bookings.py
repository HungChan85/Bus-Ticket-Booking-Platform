"""Shared transactional booking function for schedule and admin endpoints."""
import json


def create_booking(conn, currency, account_id, operator_id, trip_id, fare_id, seat_codes):
    with conn.cursor() as cursor:
        cursor.execute("""SELECT sp_create_booking_with_tickets(
            %s, %s::integer, %s, %s::integer, %s::integer, %s::jsonb, NULL
        )""", (currency, account_id, operator_id, trip_id, fare_id, json.dumps(seat_codes)))
        booking_id = cursor.fetchone()[0]
        cursor.execute("SELECT ticket_id, serial_number FROM ticket WHERE booking_id = %s ORDER BY ticket_id",
                       (booking_id,))
        serials = [{"ticket_id": row[0], "serial_number": row[1]} for row in cursor.fetchall()]
    return booking_id, serials
