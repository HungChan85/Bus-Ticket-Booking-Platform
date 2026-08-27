# VietBus Backend API

Flask-based REST API backend for the VietBus inter-city bus booking system. Handles authentication, trip scheduling, seat reservations, and administrative operations.

---

## Table of Contents
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Database Integration](#database-integration)
- [Error Handling](#error-handling)

---

## Architecture

The backend follows a modular **Blueprint** architecture with clear separation of concerns:

- **Application Factory Pattern**: `factory.py` centralizes app creation and configuration
- **Blueprint-based Routing**: Each domain (auth, trips, bookings) has its own route module
- **Database Layer**: `utils/database.py` handles MySQL connection pooling
- **JWT Authentication**: `utils/jwt_helper.py` provides token generation and validation
- **Stored Procedure Integration**: Leverages MySQL stored procedures for complex business logic

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Flask** | Latest | Web framework for RESTful API |
| **MySQL Connector** | `mysql-connector-python` | Database driver for MySQL connectivity |
| **PyJWT** | Latest | JWT token encoding/decoding for authentication |
| **Flask-CORS** | Latest | Cross-Origin Resource Sharing support |
| **Python Dotenv** | Latest | Environment variable management |

---

## Project Structure

```
backend/
├── app.py                  # Application entrypoint
├── factory.py              # Flask app factory with blueprint registration
├── config.py               # Configuration module (currently empty)
├── requirements.txt        # Python dependencies
├── Dockerfile              # Container configuration
├── .env                    # Environment variables (not committed)
├── .env.example            # Example environment configuration
│
├── routes/                 # API endpoint blueprints
│   ├── __init__.py
│   ├── auth.py            # Authentication (login, register)
│   ├── admin.py           # Admin operations (CRUD for all entities)
│   ├── booking.py         # Booking creation and retrieval
│   ├── schedule.py        # Trip search and scheduling
│   ├── trips.py           # Trip management
│   ├── routes.py          # Route management
│   ├── ticket.py          # Ticket lookup
│   └── profile.py         # User profile and booking history
│
└── utils/                  # Shared utilities
    ├── __init__.py
    ├── database.py        # MySQL connection management
    └── jwt_helper.py      # JWT token utilities and decorators
```

---

## Setup & Installation

### Prerequisites
- Python 3.8+
- MySQL 8.0+
- Virtual environment tool (venv or virtualenv)

### Installation Steps

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

   Required variables in `.env`:
   ```dotenv
   DB_USER=root
   DB_PASSWORD=your_password
   DB_HOST=127.0.0.1
   DB_NAME=defaultdb
   DB_PORT=3306
   
   FLASK_SECRET=your-secret-key-here
   JWT_SECRET=your-jwt-secret-here
   JWT_EXPIRES_IN_SECONDS=86400
   ```

5. **Initialize database:**
   ```bash
   # Run schema.sql and seed.sql from ../database/ directory
   mysql -u root -p defaultdb < ../database/schema.sql
   mysql -u root -p defaultdb < ../database/seed.sql
   ```

6. **Run the application:**
   ```bash
   python app.py
   ```

   Server starts at: `http://localhost:9000`

---

## API Endpoints

### Authentication (`/api`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new passenger or staff account | No |
| POST | `/login` | Authenticate user and receive JWT token | No |

### Public Routes

#### Schedule (`/api/schedule`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stations` | List all active stations |
| GET | `/trips?from=X&to=Y&date=Z` | Search trips by departure/arrival stations and date |
| GET | `/trips/:id` | Get detailed trip information with available seats |
| POST | `/bookings` | Create new booking (requires auth) |

#### Tickets (`/api/tickets`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/lookup` | Lookup ticket by serial number or booking ID |

#### Routes (`/api/routes`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all routes with station details |
| POST | `/` | Create new route |
| PATCH | `/:id` | Update route details |
| DELETE | `/:id` | Delete route |

#### Trips (`/api/trips`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List trips with filters (status, date, route) |
| GET | `/:id/booked-seats` | Get list of booked seat codes |
| GET | `/:id/seats` | Get available seat count |
| GET | `/buses/active` | List all active buses |
| POST | `/` | Schedule new trip (calls `sp_schedule_trip`) |
| PATCH | `/:id` | Update trip details |
| DELETE | `/:id` | Cancel trip |

### User Routes (Requires Authentication)

#### Profile (`/api/profile`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:account_id` | Get user profile information |
| GET | `/:account_id/tickets` | Get user's booking history |

#### Bookings (`/api/bookings`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create` | Create booking with tickets (calls `sp_create_booking_with_tickets`) |
| GET | `/:id` | Get booking details |

### Admin Routes (`/api/admin`)

**All admin routes require staff authentication.**

#### Station Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stations` | List all stations |
| POST | `/stations` | Create new station |
| PATCH | `/stations/:id` | Update station details |
| DELETE | `/stations/:id` | Delete station |

#### Operator Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/operators` | List all operators |
| POST | `/operators` | Create new operator |
| DELETE | `/operators/:id` | Delete operator |

#### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/passengers` | List all passengers |
| GET | `/passengers/:id/account-info` | Get passenger account details |
| PATCH | `/passengers/:id/account-status` | Update passenger account status |
| GET | `/staffs` | List all staff members |
| GET | `/staffs/:id/account-info` | Get staff account details |
| PATCH | `/staffs/:id/account-status` | Update staff account status |

#### Trip Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trips` | List all trips |
| GET | `/trips/:id/seats` | Get seat availability for trip |
| POST | `/trips` | Schedule new trip |
| PATCH | `/trips/:id` | Update trip status/details |
| DELETE | `/trips/:id` | Cancel trip |

#### Route Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/routes` | List all routes |
| POST | `/routes` | Create new route |
| PATCH | `/routes/:id` | Update route details |
| DELETE | `/routes/:id` | Delete route |

#### Bus Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/buses` | List all buses |
| POST | `/buses` | Add new bus |
| PATCH | `/buses/:id` | Update bus details |
| DELETE | `/buses/:id` | Delete bus |

#### Fare Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/fares` | List all fare rules |
| GET | `/fares/:id` | Get fare details |
| POST | `/fares` | Create new fare rule |
| PATCH | `/fares/:id` | Update fare rule |

#### Booking & Ticket Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/bookings` | List all bookings |
| POST | `/bookings` | Create admin booking |
| PATCH | `/bookings/:id` | Update booking status |
| DELETE | `/bookings/:id` | Cancel booking |
| GET | `/tickets` | List all tickets |
| GET | `/tickets/:id` | Get ticket details |
| POST | `/tickets/:id/refund` | Refund ticket (calls `sp_refund_ticket`) |
| PATCH | `/tickets/:id` | Update ticket status |
| POST | `/bookings/:id/tickets` | Add tickets to existing booking |

---

## Authentication

### JWT Token Flow

1. **Registration/Login:**
   - User submits credentials to `/api/register` or `/api/login`
   - Backend validates credentials against database
   - Returns JWT token with user role and account info

2. **Token Structure:**
   ```json
   {
     "account_id": 123,
     "role": "USER|STAFF|ADMIN",
     "email": "user@example.com",
     "iat": 1234567890,
     "exp": 1234654290
   }
   ```

3. **Protected Routes:**
   - Client includes token in request header: `Authorization: Bearer <token>`
   - Backend validates token using `@token_required` decorator
   - User info available in `g.current_user`

### Role-Based Access Control

- **USER/PASSENGER**: Can book tickets, view own bookings, search schedules
- **STAFF**: Can manage trips, view bookings, update trip status
- **ADMIN**: Full access to all CRUD operations

### JWT Helper Functions

Located in `utils/jwt_helper.py`:

| Function | Purpose |
|----------|---------|
| `generate_token(payload, expires_in)` | Create signed JWT with expiration |
| `decode_token(token)` | Validate and decode JWT |
| `token_required(allowed_roles)` | Decorator to protect routes with role checking |

---

## Database Integration

### Connection Management

`utils/database.py` provides:
- `db_connection()`: Returns MySQL connection instance
- Automatically loads credentials from environment variables
- Connection pooling handled by mysql-connector-python

### Stored Procedure Usage

The backend extensively uses MySQL stored procedures for data integrity:

| Stored Procedure | Usage | File |
|------------------|-------|------|
| `sp_create_passenger_account` | User registration | `auth.py` |
| `sp_create_staff_account` | Staff registration | `auth.py` |
| `sp_schedule_trip` | Trip scheduling | `trips.py`, `admin.py` |
| `sp_create_booking_with_tickets` | Booking creation | `booking.py` |
| `fn_get_available_seats` | Seat availability | `trips.py`, `schedule.py` |
| `fn_calculate_booking_total` | Total calculation | `schedule.py`, `admin.py` |

**Benefits:**
- Complex validation logic encapsulated in database
- Transaction safety with automatic rollback
- Reduced round-trip queries
- Centralized business rules

---

## Error Handling

### Global Error Handlers

Defined in `factory.py`:

- **404 Not Found**: Returns `{"error": "not_found"}`
- **500 Internal Server Error**: Returns `{"error": "internal_server_error"}`

### API Response Format

**Success Response:**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "error": "error_code"
}
```

### Common Error Scenarios

1. **Database Errors**: MySQL stored procedures throw `SQLSTATE '45000'` for business rule violations
2. **Authentication Errors**: Invalid/expired tokens return 401 Unauthorized
3. **Validation Errors**: Missing required fields return 400 Bad Request
4. **Permission Errors**: Insufficient role access returns 403 Forbidden

---

## Running with Docker

```bash
# Build image
docker build -t vietbus-backend .

# Run container
docker run -p 9000:9000 \
  -e DB_HOST=host.docker.internal \
  -e DB_USER=root \
  -e DB_PASSWORD=yourpassword \
  -e DB_NAME=defaultdb \
  vietbus-backend
```

---

## Development Notes

### Adding New Routes

1. Create new blueprint in `routes/` directory
2. Register blueprint in `factory.py`:
   ```python
   from routes.myroute import myroute_bp
   app.register_blueprint(myroute_bp, url_prefix="/api/myroute")
   ```

### Database Queries

- Use parameterized queries to prevent SQL injection
- Prefer stored procedures for complex operations
- Always close cursors and connections in `finally` blocks
- Use `dictionary=True` cursor for easier JSON serialization

### Security Best Practices

- Never commit `.env` file to version control
- Rotate JWT secret keys regularly in production
- Use HTTPS in production environments
- Validate all user inputs before database operations
- Implement rate limiting for authentication endpoints

---

## API Testing

### Using cURL

**Register User:**
```bash
curl -X POST http://localhost:9000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "role": "PASSENGER",
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "0912345678",
    "password": "password123",
    "gov_id": "123456789",
    "dob": "1990-01-01"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:9000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "role": "passenger"
  }'
```

**Search Trips:**
```bash
curl "http://localhost:9000/api/schedule/trips?from=1&to=3&date=2026-02-01"
```

---

## Troubleshooting

### Common Issues

1. **Connection Refused:**
   - Check if MySQL server is running
   - Verify DB credentials in `.env`
   - Check firewall settings

2. **JWT Token Invalid:**
   - Ensure `JWT_SECRET` matches between environments
   - Check token expiration time

3. **CORS Errors:**
   - Verify Flask-CORS is installed
   - Check allowed origins in CORS configuration

4. **Stored Procedure Errors:**
   - Ensure database schema and seed files are executed
   - Check stored procedure parameters match backend calls

---

## License

This project is part of the VietBus recruitment task demonstration system.


