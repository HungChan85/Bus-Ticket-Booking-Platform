import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import RouteTable from '../components/tables/RouteTable';
import TripTable from '../components/tables/TripTable';
import { RouteDetailModal, TripDetailModal } from '../components/modals/DetailModals';
import RouteFormModal from '../components/modals/RouteFormModal';
import TripFormModal from '../components/modals/TripFormModal';
import { apiUrl } from '../utils/api';

const ManageTrips = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('routes'); // 'routes' or 'trips'
  const [isRouteFormOpen, setIsRouteFormOpen] = useState(false);
  const [routeFormMode, setRouteFormMode] = useState('create');
  const [editingRoute, setEditingRoute] = useState(null);
  const [routeRefreshKey, setRouteRefreshKey] = useState(0);
  const [operatorOptions, setOperatorOptions] = useState([]);
  
  const [isTripFormOpen, setIsTripFormOpen] = useState(false);
  const [tripFormMode, setTripFormMode] = useState('create');
  const [editingTrip, setEditingTrip] = useState(null);
  const [tripRefreshKey, setTripRefreshKey] = useState(0);
  
  // Modal states
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);

  useEffect(() => {
    // Kiểm tra user có phải staff không
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }

    try {
      const userData = JSON.parse(loggedInUser);
      
      // Kiểm tra role - chỉ staff mới được truy cập
      if (userData.role !== 'STAFF') {
        alert('Bạn không có quyền truy cập trang này!');
        navigate('/');
        return;
      }
      
      setUser(userData);
    } catch (e) {
      console.error("Lỗi đọc dữ liệu user", e);
      localStorage.removeItem('user');
      navigate('/login');
    }
  }, [navigate]);

  // Route handlers
  const handleRouteAdd = () => {
    setRouteFormMode('create');
    setEditingRoute(null);
    setIsRouteFormOpen(true);
  };

  const handleRouteEdit = (route) => {
    setRouteFormMode('edit');
    setEditingRoute(route);
    setIsRouteFormOpen(true);
  };

  const handleRouteDelete = (route) => {
    if (window.confirm(`Are you sure you want to delete route #${route.route_id}?`)) {
      alert(`Delete route ${route.route_id} - To be implemented with API call`);
    }
  };

  const handleRouteViewDetail = (route) => {
    setSelectedRoute(route);
  };

  const handleRouteFormSuccess = () => {
    setIsRouteFormOpen(false);
    setEditingRoute(null);
    setRouteRefreshKey((prev) => prev + 1);
  };

  const handleRoutesLoaded = (routesList) => {
    if (!Array.isArray(routesList)) return;
    const seen = new Set();
    const operators = [];
    routesList.forEach((r) => {
      if (r.operator_id && !seen.has(r.operator_id)) {
        seen.add(r.operator_id);
        operators.push({ operator_id: r.operator_id, operator_name: r.operator_name });
      }
    });
    setOperatorOptions(operators);
  };

  const handleTripFormSuccess = () => {
    setIsTripFormOpen(false);
    setEditingTrip(null);
    setTripRefreshKey((prev) => prev + 1);
  };

  // Trip handlers
  const handleTripAdd = () => {
    setTripFormMode('create');
    setEditingTrip(null);
    setIsTripFormOpen(true);
  };

  const handleTripEdit = (trip) => {
    setTripFormMode('edit');
    setEditingTrip(trip);
    setIsTripFormOpen(true);
  };

  const handleTripDelete = async (trip) => {
    // Show confirmation dialog with trip details
    const confirmMessage = `Are you sure you want to cancel trip #${trip.trip_id}?\n\n` +
      `Route: ${trip.route_name}\n` +
      `Bus: ${trip.bus_plate}\n` +
      `Departure: ${new Date(trip.service_date).toLocaleString()}\n\n` +
      `Note: This will cancel the trip and may affect passengers with confirmed tickets.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/trips/${trip.trip_id}`), {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle trigger validation errors
        if (response.status === 409) {
          alert(`Cannot cancel trip:\n\n${data.error}\n\nPlease refund or cancel the tickets first.`);
        } else {
          throw new Error(data.error || 'Failed to cancel trip');
        }
        return;
      }
      
      alert('Trip cancelled successfully!');
      setTripRefreshKey(prev => prev + 1);
    } catch (error) {
      alert(`Error cancelling trip: ${error.message}`);
    }
  };

  const handleTripViewDetail = (trip) => {
    setSelectedTrip(trip);
  };

  if (!user) {
    return null; // Hoặc loading spinner
  }

  return (
    <div>
      <Header />
      <div className="page-container" style={{ minHeight: '70vh', padding: '40px 20px' }}>
        <div className="container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '30px'
          }}>
            <h1 style={{ 
              color: 'var(--futa-orange)', 
              margin: 0,
              fontSize: '2rem',
              fontWeight: 'bold'
            }}>
              Manage Routes & Trips
            </h1>
            <p style={{ color: '#666', margin: 0 }}>
              Welcome, <strong>{user?.name}</strong>!
            </p>
          </div>

          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '30px',
            borderBottom: '2px solid #e0e0e0'
          }}>
            <button
              onClick={() => setActiveTab('routes')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'transparent',
                color: activeTab === 'routes' ? 'var(--futa-orange)' : '#666',
                fontWeight: activeTab === 'routes' ? 'bold' : 'normal',
                fontSize: '16px',
                cursor: 'pointer',
                borderBottom: activeTab === 'routes' ? '3px solid var(--futa-orange)' : 'none',
                marginBottom: '-2px',
                transition: 'all 0.3s'
              }}
            >
              Routes
            </button>
            <button
              onClick={() => setActiveTab('trips')}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'transparent',
                color: activeTab === 'trips' ? 'var(--futa-orange)' : '#666',
                fontWeight: activeTab === 'trips' ? 'bold' : 'normal',
                fontSize: '16px',
                cursor: 'pointer',
                borderBottom: activeTab === 'trips' ? '3px solid var(--futa-orange)' : 'none',
                marginBottom: '-2px',
                transition: 'all 0.3s'
              }}
            >
              Trips
            </button>
          </div>

          {/* Content Area */}
          <div>
            {activeTab === 'routes' && (
              <RouteTable
                onAdd={handleRouteAdd}
                onEdit={handleRouteEdit}
                onDelete={handleRouteDelete}
                onViewDetail={handleRouteViewDetail}
                refreshToken={routeRefreshKey}
                onRoutesLoaded={handleRoutesLoaded}
              />
            )}

            {activeTab === 'trips' && (
              <TripTable
                onAdd={handleTripAdd}
                onEdit={handleTripEdit}
                onDelete={handleTripDelete}
                onViewDetail={handleTripViewDetail}
                refreshToken={tripRefreshKey}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedRoute && (
        <RouteDetailModal
          route={selectedRoute}
          onClose={() => setSelectedRoute(null)}
        />
      )}

      {isRouteFormOpen && (
        <RouteFormModal
          isOpen={isRouteFormOpen}
          mode={routeFormMode}
          route={editingRoute}
          onClose={() => {
            setIsRouteFormOpen(false);
            setEditingRoute(null);
          }}
          onSuccess={handleRouteFormSuccess}
          operatorOptions={operatorOptions}
        />
      )}

      {isTripFormOpen && (
        <TripFormModal
          isOpen={isTripFormOpen}
          mode={tripFormMode}
          trip={editingTrip}
          onClose={() => {
            setIsTripFormOpen(false);
            setEditingTrip(null);
          }}
          onSuccess={handleTripFormSuccess}
        />
      )}

      {selectedTrip && (
        <TripDetailModal
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
        />
      )}

      <Footer />
    </div>
  );
};

export default ManageTrips;
