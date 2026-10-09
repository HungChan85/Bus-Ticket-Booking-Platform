"""Backend application entrypoint.

Creates the Flask app via the central factory. All blueprint
registration happens inside `backend.factory.create_app`.
Run with: `python backend/app.py` from project root.
"""

import os

from factory import create_app, DefaultConfig
from trip_maintenance import init_scheduler

app = create_app(DefaultConfig)

# Initialize the automated trip generation scheduler
if os.getenv("ENABLE_DEMO_SCHEDULER", "1") == "1":
    init_scheduler(app)

if __name__ == "__main__":
    #app.run(debug=True)
    # add host = 0.0.0.0 to be accessible from outside the container
    app.run(host="0.0.0.0", port=9000, debug=os.getenv("FLASK_DEBUG", "0") == "1", use_reloader=False)
