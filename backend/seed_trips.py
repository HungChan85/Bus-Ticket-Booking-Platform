import time
from datetime import datetime, timedelta
import random
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from utils.database import db_connection

# Setup basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def delete_old_trips():
    """Delete trips that are older than 7 days based on arrival_datetime"""
    try:
        cnx = db_connection()
        cursor = cnx.cursor()
        
        # This will cascade delete related tickets & bookings due to ON DELETE CASCADE
        delete_query = """
            DELETE FROM trip 
            WHERE arrival_datetime < DATE_SUB(NOW(), INTERVAL 7 DAY)
        """
        cursor.execute(delete_query)
        cnx.commit()
        
        deleted_count = cursor.rowcount
        logger.info(f"Deleted {deleted_count} old trips.")
        
        cursor.close()
        cnx.close()
    except Exception as e:
        logger.error(f"Error deleting old trips: {e}")


def generate_upcoming_trips(days_ahead=3):
    """
    Generate trips for upcoming days (e.g., today to today + days_ahead).
    Makes sure trips aren't duplicated.
    """
    try:
        cnx = db_connection()
        cursor = cnx.cursor(dictionary=True)
        
        # 1. Get all routes
        cursor.execute("SELECT route_id FROM routetrip")
        routes = cursor.fetchall()
        
        # 2. Get all active buses
        cursor.execute("SELECT bus_id FROM bus WHERE bus_active_flag = 'Active'")
        active_buses = cursor.fetchall()
        
        if not routes or not active_buses:
            logger.warning("No routes or active buses found. Cannot generate trips.")
            return

        today = datetime.now().date()
        trips_created = 0

        # Departure hours distributions
        departure_hours = ["07:00:00", "13:30:00", "20:00:00"]
        
        for day_offset in range(0, days_ahead + 1):
            target_date = today + timedelta(days=day_offset)
            
            for route in routes:
                route_id = route['route_id']
                
                # Check if trips already exist for this route on this target_date
                check_query = """
                    SELECT COUNT(*) as count 
                    FROM trip 
                    WHERE route_id = %s AND DATE(service_date) = %s
                """
                cursor.execute(check_query, (route_id, target_date))
                count = cursor.fetchone()['count']
                
                # If trips already scheduled for this route on this date, skip
                if count > 0:
                    continue
                
                # Create a few trips across the day
                for time_str in departure_hours:
                    # Randomly select an active bus
                    bus_id = random.choice(active_buses)['bus_id']
                    
                    service_datetime_str = f"{target_date} {time_str}"
                    
                    insert_query = """
                        INSERT INTO trip (trip_status, service_date, bus_id, route_id) 
                        VALUES ('Scheduled', %s, %s, %s)
                    """
                    cursor.execute(insert_query, (service_datetime_str, bus_id, route_id))
                    trips_created += 1
                
        cnx.commit()
        logger.info(f"Generated {trips_created} new trips for the next {days_ahead} days.")
        
        cursor.close()
        cnx.close()
    except Exception as e:
        logger.error(f"Error generating trips: {e}")

def run_jobs():
    logger.info("Starting automated trip maintenance job...")
    delete_old_trips()
    # Ensure flights are populated for the next 7 days continuously
    generate_upcoming_trips(days_ahead=7)
    logger.info("Finished automated trip maintenance job.")

def init_scheduler(app=None):
    """
    Initialize the APScheduler inside the Flask app.
    Runs on a regular schedule at 00:00 every day.
    """
    # Create the scheduler
    scheduler = BackgroundScheduler(daemon=True)
    
    # Add daily job at 00:00 AM
    scheduler.add_job(func=run_jobs, trigger="cron", hour=0, minute=0, id="daily_trip_job", replace_existing=True)
    
    # Start the scheduler
    scheduler.start()
    logger.info("APScheduler initialized to run daily at 00:00.")

if __name__ == "__main__":
    # If run standalone as a script
    print("Running trip seed script manually.")
    run_jobs()
