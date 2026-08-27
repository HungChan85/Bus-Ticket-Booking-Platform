import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Homepage from './pages/Homepage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import TicketLookup from './pages/TicketLookup.jsx';
import SchedulePage from './pages/SchedulePage.jsx';
import ManageTrips from './pages/ManageTrips.jsx';
import TripDetail from './components/features/TripDetail.jsx';
import Profile from './pages/Profile.jsx';
import Sidebar from "./components/Sidebar.jsx";
import Page1 from "./pages/Page1.jsx";
import Page2 from "./pages/Page2.jsx";
import Page3 from "./pages/Page3.jsx";
import { getAuthToken, getStoredUser } from "./utils/auth";

function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-content">
        {children}
      </div>
    </div>
  );
}

function AdminRoute({ children }) {
  const token = getAuthToken();
  const user = getStoredUser();
  if (!token || user?.role !== "ADMIN") {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/lookup" element={<TicketLookup />} />
          
          {/* Trang Lịch trình, đặt vé */}
          <Route path="/schedule" element={<SchedulePage />} />

          {/* Trang chi tiết chuyến xe */}
          <Route path="/trip/:tripId" element={<TripDetail />} />

          {/* Trang Profile */}
          <Route path="/profile" element={<Profile />} />

          {/* Trang Manage Trips - chỉ cho Staff */}
          <Route path="/manage-trips" element={<ManageTrips />} />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Page1 />
                </AdminLayout>
              </AdminRoute>
            }
          />

          <Route
            path="/admin/page-2"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Page2 />
                </AdminLayout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/page-3"
            element={
              <AdminRoute>
                <AdminLayout>
                  <Page3 />
                </AdminLayout>
              </AdminRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
