# backend/Dockerfile

FROM python:3.10-slim

WORKDIR /app



# Copy file requirements and setup libraries
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy entire backend directory into the container
# The structure inside the container will be /app/backend/...
COPY backend ./backend

# Expose port 9000
EXPOSE 9000

# Set environment variable for Python to recognize modules from root directory
ENV PYTHONPATH=/app

# Run the server
CMD ["python", "backend/app.py"]