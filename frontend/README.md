# VietBus Frontend

React-based web application for the VietBus inter-city bus booking system. Provides user-friendly interfaces for ticket booking, schedule search, and administrative management.

---

## Table of Contents
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Available Scripts](#available-scripts)
- [Features](#features)
- [Page Routes](#page-routes)
- [Authentication Flow](#authentication-flow)
- [API Integration](#api-integration)
- [Styling](#styling)
- [Docker Deployment](#docker-deployment)
- [Development Notes](#development-notes)
- [Browser Support](#browser-support)
- [Troubleshooting](#troubleshooting)

---

## Technology Stack

- **React 19** - UI framework
- **React Router DOM** - Client-side routing
- **Vite** - Build tool and dev server
- **CSS** - Styling (no CSS framework)

---

## Project Structure

```
frontend/
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── Dockerfile              # Container configuration
│
└── src/
    ├── App.jsx             # Main app with routing
    ├── App.css             # Global styles
    ├── main.jsx            # React entry point
    │
    ├── pages/              # Page components
    │   ├── Homepage.jsx           # Landing page with search
    │   ├── AuthPage.jsx           # User login/registration
    │   ├── AdminLogin.jsx         # Admin/staff login
    │   ├── SchedulePage.jsx       # Trip search results
    │   ├── TicketLookup.jsx       # Ticket verification
    │   ├── Profile.jsx            # User profile & bookings
    │   ├── ManageTrips.jsx        # Admin trip management
    │   └── Page1/2/3.jsx          # Admin CRUD pages
    │
    ├── components/
    │   ├── Sidebar.jsx            # Admin navigation sidebar
    │   ├── DataTable.jsx          # Reusable data table
    │   ├── UniversalCRUDModal.jsx # Generic CRUD modal
    │   │
    │   ├── features/              # Feature-specific components
    │   │   ├── SearchForm.jsx           # Trip search form
    │   │   ├── ScheduleSearchBar.jsx    # Header search bar
    │   │   ├── SeatSelector.jsx         # Seat selection UI
    │   │   ├── TripCard.jsx             # Trip display card
    │   │   └── TripDetail.jsx           # Trip detail page
    │   │
    │   ├── layout/                # Layout components
    │   │   ├── Header.jsx               # Site header
    │   │   └── Footer.jsx               # Site footer
    │   │
    │   ├── modals/                # Modal components
    │   │   ├── RouteFormModal.jsx
    │   │   ├── TripFormModal.jsx
    │   │   └── DetailModals.jsx
    │   │
    │   └── tables/                # Table components
    │       ├── RouteTable.jsx
    │       └── TripTable.jsx
    │
    ├── utils/              # Utility functions
    │   ├── api.js         # API URL configuration
    │   ├── auth.js        # Authentication helpers
    │   └── date.js        # Date formatting utilities
    │
    └── data/
        └── mockTrips.js   # Mock data for development
```

---

## Setup & Installation

### Prerequisites
- Node.js 18+ and npm

### Installation

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API endpoint:**
   
   Edit `src/utils/api.js` to point to your backend:
   ```javascript
   const API_BASE_URL = 'http://localhost:9000';
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   Application runs at: `http://localhost:5173`

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint for code quality |

---

## Features

### Public Features
- **Homepage**: Hero section with trip search form
- **Schedule Search**: Filter trips by departure/arrival stations and date
- **Trip Details**: View route information, pricing, and available seats
- **Seat Selection**: Interactive seat map for booking
- **Ticket Lookup**: Verify ticket by serial number or booking ID
- **User Authentication**: Login and registration for passengers/staff

### User Features (Authenticated)
- **Profile Page**: View personal information
- **Booking History**: List of all user bookings and tickets
- **Ticket Management**: View ticket details and status

### Admin Features (Staff/Admin)
- **Dashboard**: Overview statistics and quick actions
- **Trip Management**: Create, update, cancel trips
- **Route Management**: CRUD operations for routes
- **Operator Management**: Manage bus operators
- **Station Management**: CRUD operations for stations
- **Bus Fleet Management**: Track and manage buses
- **Fare Rules**: Configure pricing by route and class
- **Booking Overview**: View all bookings and tickets
- **User Management**: View and manage passenger/staff accounts

---

## Page Routes

| Route | Component | Description | Auth Required |
|-------|-----------|-------------|---------------|
| `/` | Homepage | Landing page with search | No |
| `/auth` | AuthPage | Login/Register | No |
| `/admin-login` | AdminLogin | Admin login | No |
| `/schedule` | SchedulePage | Trip search results | No |
| `/trips/:id` | TripDetail | Trip details & booking | No |
| `/tickets/lookup` | TicketLookup | Ticket verification | No |
| `/profile` | Profile | User profile & history | Yes (User) |
| `/admin/*` | Admin Pages | Management interface | Yes (Admin) |

---

## Authentication Flow

1. User logs in via `/auth` (passenger) or `/admin-login` (staff)
2. Backend returns JWT token
3. Token stored in `localStorage` as JSON object:
   ```javascript
   {
     user: { account_id, email, role },
     token: "jwt_token_here"
   }
   ```
4. Protected routes check token via `auth.js` utilities
5. Token included in API requests via `Authorization` header

---

## API Integration

All API calls use the `apiUrl()` helper from `utils/api.js`:

```javascript
import { apiUrl } from '../utils/api';

const response = await fetch(apiUrl('/api/schedule/trips'), {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## Styling

- **No CSS Framework**: Custom CSS for full control
- **Global Styles**: `App.css` contains base styles
- **Component Styles**: Page-specific CSS (e.g., `admin.css`)
- **Responsive Design**: Mobile-friendly layouts
- **Color Scheme**: 
  - Primary: Blue tones for branding
  - Secondary: Orange for CTAs
  - Status colors: Green (success), Yellow (warning), Red (error)

---

## Docker Deployment

```bash
# Build image
docker build -t vietbus-frontend .

# Run container
docker run -p 5173:5173 vietbus-frontend
```

Vite server configured with:
- `host: true` - Allow external access
- `port: 5173` - Standard Vite port
- `usePolling: true` - Hot reload in Docker

---

## Development Notes

### Adding New Pages

1. Create component in `src/pages/`
2. Add route in `App.jsx`:
   ```jsx
   <Route path="/newpage" element={<NewPage />} />
   ```

### Adding Protected Routes

```jsx
<Route path="/protected" element={
  <AdminRoute>
    <ProtectedPage />
  </AdminRoute>
} />
```

### API Calls Best Practices

- Always handle loading states
- Show user-friendly error messages
- Use try-catch for fetch calls
- Include authentication token when required

---

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

---

## Troubleshooting

### Common Issues

1. **API Connection Failed:**
   - Verify backend is running at correct port
   - Check `src/utils/api.js` URL configuration
   - Check CORS settings in backend

2. **Authentication Errors:**
   - Clear localStorage and login again
   - Verify token hasn't expired
   - Check backend JWT configuration

3. **Hot Reload Not Working:**
   - Restart dev server
   - Check Vite config `usePolling` option
   - Clear browser cache

---

## License

This project is part of the VietBus recruitment task demonstration system.
