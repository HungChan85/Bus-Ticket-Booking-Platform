"""Keep demo trips available without deleting booking history."""
import logging
import os
from datetime import datetime, timedelta, time

from apscheduler.schedulers.background import BackgroundScheduler
from utils.database import db_connection, dict_row

logger = logging.getLogger(__name__)
MAINTENANCE_LOCK = 726842102


def populate_upcoming_trips(conn, days_ahead=7):
    conn.execute("SELECT pg_advisory_xact_lock(%s)", (MAINTENANCE_LOCK,))
    today = conn.execute("SELECT CURRENT_DATE").fetchone()[0]
    with conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute("SELECT route_id, operator_id FROM routetrip ORDER BY route_id")
        routes = cursor.fetchall()
        cursor.execute("SELECT bus_id, operator_id FROM bus WHERE bus_active_flag = 'Active' ORDER BY bus_id")
        buses = cursor.fetchall()
        created = 0
        for route in routes:
            fleet = [bus for bus in buses if bus["operator_id"] == route["operator_id"]]
            if not fleet:
                continue
            for offset in range(days_ahead + 1):
                for index, departure in enumerate((time(7), time(13, 30), time(20))):
                    service_date = datetime.combine(today + timedelta(days=offset), departure)
                    cursor.execute("""
                        INSERT INTO trip(service_date, bus_id, route_id)
                        SELECT %s, %s, %s WHERE NOT EXISTS (
                            SELECT 1 FROM trip WHERE route_id = %s AND service_date = %s
                        ) ON CONFLICT DO NOTHING
                    """, (service_date, fleet[index % len(fleet)]["bus_id"], route["route_id"],
                          route["route_id"], service_date))
                    created += cursor.rowcount
        return created


def refresh_trip_statuses(conn):
    conn.execute("""
        UPDATE trip SET trip_status = CASE
            WHEN LOCALTIMESTAMP < service_date THEN 'Scheduled'
            WHEN LOCALTIMESTAMP < arrival_datetime THEN 'Departed'
            ELSE 'Arrived' END
        WHERE trip_status <> 'Cancelled'
          AND trip_status IS DISTINCT FROM CASE
            WHEN LOCALTIMESTAMP < service_date THEN 'Scheduled'
            WHEN LOCALTIMESTAMP < arrival_datetime THEN 'Departed'
            ELSE 'Arrived' END
    """)


def run_jobs():
    try:
        with db_connection() as conn:
            created = populate_upcoming_trips(conn)
            refresh_trip_statuses(conn)
        logger.info("Created %s upcoming demo trips", created)
    except Exception:
        logger.exception("Demo trip maintenance failed")


def update_statuses():
    try:
        with db_connection() as conn:
            refresh_trip_statuses(conn)
    except Exception:
        logger.exception("Trip status refresh failed")


def init_scheduler(app=None):
    scheduler = BackgroundScheduler(daemon=True, timezone=os.getenv("APP_TIMEZONE", "Asia/Ho_Chi_Minh"))
    scheduler.add_job(run_jobs, "cron", hour=0, minute=0, id="daily_demo_trips")
    scheduler.add_job(update_statuses, "interval", minutes=1, id="trip_statuses")
    # Refresh on startup too, including after a long period with the demo stopped.
    run_jobs()
    scheduler.start()
    if app is not None:
        app.extensions["demo_scheduler"] = scheduler
    return scheduler


if __name__ == "__main__":
    run_jobs()
