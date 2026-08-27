# 🚌 Bus Ticket Booking Platform

<!-- ================================================================= -->
<!-- USER CONTENT: Project Overview, Objectives, Personal Context      -->
<!-- ================================================================= -->
## 📌 Project Overview

<!-- Add a brief project summary, problem statement, and target audience here -->
> *An online bus ticket booking platform that enables users to search routes, browse trips, select seats in real-time, manage bookings, and view e-tickets.*

---

## 🏗️ System Architecture

The application adopts an **N-Tier Client-Server Architecture** decoupling the Frontend UI, Backend REST API, and Relational Database layer:
```
┌──────────────────────────────────────────────────────────┐
│                   Frontend (SPA Client)                  │
│       HTML5, CSS3, JavaScript (Vanilla ES6+), Nginx      │
└────────────────────────────┬─────────────────────────────┘
│  HTTP / REST API (JSON)
▼
┌──────────────────────────────────────────────────────────┐
│                   Backend (REST API Engine)              │
│       Python (Flask Application Factory Pattern)         │
│  - Blueprints: Auth, Trips, Routes, Booking, Ticket, etc.│
│  - Security: JWT Authentication, Password Hashing        │
└────────────────────────────┬─────────────────────────────┘
│  PyMySQL / Connection Pool
▼
┌──────────────────────────────────────────────────────────┐
│                   Database Layer (RDBMS)                 │
│         MySQL 8.0 (Relational Database / Cloud DB)       │
└──────────────────────────────────────────────────────────┘
```
## 🛠️ Tech Stack

### Backend
* **Language & Runtime:** Python 3.10+
* **Framework:** Flask (utilizing the *Application Factory Pattern* and *Blueprints*)
* **Database Driver:** `PyMySQL`, `mysql-connector-python`
* **Authentication & Security:** JWT (`PyJWT`), `werkzeug.security` (Password Hashing), SSL CA Cert
* **CORS & Utilities:** `flask-cors`, `python-dotenv`

### Frontend
* **Core:** HTML5, CSS3, JavaScript (ES6 Modules)
* **Styling & Assets:** Custom Responsive CSS, Vector Assets, Image banners
* **Web Server (Production Container):** Nginx Alpine

### DevOps & Database
* **Database:** MySQL 8.0
* **Containerization:** Docker, Docker Compose (Multi-container orchestration)

---

## 🗄️ Database Design

The relational database is normalized and modeled based on the following Entity-Relationship structure:

![ER diagram](database\Entity-relationship-diagram.png)

### Core Entities:
* `users`: Stores customer and admin profiles along with securely hashed passwords.
* `routes`: Travel routes including departure point, destination, estimated duration, and distance.
* `trips`: Specific scheduled trips with departure times, ticket pricing, and assigned vehicle/driver details.
* `bus_seats`: Real-time seat inventory for each trip (available, reserved, booked).
* `bookings`: Booking transactions, total fare, payment methods, and status.
* `tickets`: E-ticket records linked with unique QR codes for boarding verification.

---

## 🔌 API Endpoints Specification

All API endpoints accept and return payloads formatted in `application/json`.


### 1. Authentication (`/api/auth`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new user account |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive Bearer JWT |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile |

### 2. Routes & Trips (`/api/routes`, `/api/trips`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/routes` | Public | List all available routes |
| `GET` | `/api/trips/search` | Public | Query trips by date, origin, and destination |
| `GET` | `/api/trips/<trip_id>` | Public | Get trip details and real-time seat layout |

### 3. Booking & Tickets (`/api/booking`, `/api/ticket`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/booking/create` | Authenticated | Create a new booking and hold selected seats |
| `GET` | `/api/booking/history` | Authenticated | Fetch booking history for the current user |
| `GET` | `/api/ticket/<ticket_id>` | Authenticated | Retrieve e-ticket data & QR validation code |
| `POST` | `/api/booking/cancel` | Authenticated | Cancel a booking according to policy |

### 4. Admin Management (`/api/admin`)
| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/trips` | Admin | Create a new scheduled trip |
| `PUT` | `/api/admin/trips/<id>` | Admin | Update trip information or status |
| `GET` | `/api/admin/reports` | Admin | Access revenue and seat occupancy metrics |

---

## 🚀 Setup & Installation Guide

### Option 1: Quickstart with Docker Compose (Recommended)

Requires [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/HungChan85/Bus-Ticket-Booking-Platform.git](https://github.com/HungChan85/Bus-Ticket-Booking-Platform.git)
   cd Bus-Ticket-Booking-Platform




## 📂 Project Structure

```
Bus-Ticket-Booking-Platform/
├── backend/
│   ├── routes/              # Blueprint modules (auth, booking, trips, admin, etc.)
│   ├── utils/               # Database connectors, JWT helpers, validators
│   ├── app.py               # Main Flask entry point
│   ├── config.py            # Environment configurations
│   ├── factory.py           # Application Factory initialization
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment template file
│   └── Dockerfile           # Backend container build recipe
├── frontend/
│   ├── assets/              # Images, icons, design assets
│   ├── css/ & js/           # Client-side styles and modular scripts
│   ├── index.html           # Main SPA entry point
│   └── Dockerfile           # Frontend Nginx static build recipe
├── database/
│   ├── schema.sql           # Database schema definition (DDL)
│   ├── seed.sql             # Seed data for testing and mock records
│   └── Entity-relationship-diagram.png
├── docker-compose.yml       # Multi-container orchestration
└── README.md
```

