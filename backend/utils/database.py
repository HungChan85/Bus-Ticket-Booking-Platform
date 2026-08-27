from datetime import datetime, date
import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def db_connection():
    current_file_path = os.path.abspath(__file__) 
    backend_dir = os.path.dirname(os.path.dirname(current_file_path)) 
    ssl_cert_path = os.path.join(backend_dir, "ca.pem")

    db_config = {
        "host": os.getenv("DB_HOST"),
        "port": os.getenv("DB_PORT"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
        "database": os.getenv("DB_NAME"),
    }

    # Chỉ dùng SSL nếu không phải localhost (hoặc dựa vào biến môi trường khác)
    if os.getenv("DB_HOST") != "127.0.0.1" and os.getenv("DB_HOST") != "localhost":
        db_config["ssl_ca"] = ssl_cert_path
        db_config["ssl_verify_cert"] = True

    return mysql.connector.connect(**db_config)