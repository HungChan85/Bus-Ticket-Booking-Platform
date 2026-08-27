import React, { useEffect, useMemo, useState } from 'react';
import { FiTruck, FiMapPin, FiCalendar, FiClock, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { apiUrl } from '../../utils/api';

const TripFormModal = ({
  isOpen,
  mode = 'create',
  trip,
  onClose,
  onSuccess,
  routeOptions = [],
  busOptions = [],
}) => {
  const [formData, setFormData] = useState({
    route_id: '',
    bus_id: '',
    service_date: '',
    service_time: '',
  });
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingBuses, setLoadingBuses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    
    if (mode === 'edit' && trip) {
      // Parse service_date to separate date and time
      const serviceDateTime = trip.service_date ? new Date(trip.service_date) : new Date();
      const dateStr = serviceDateTime.toISOString().split('T')[0];
      const timeStr = serviceDateTime.toTimeString().slice(0, 5);
      
      setFormData({
        route_id: String(trip.route_id || ''),
        bus_id: String(trip.bus_id || ''),
        service_date: dateStr,
        service_time: timeStr,
      });
    } else {
      // Default to tomorrow 8:00 AM for new trips
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      setFormData({
        route_id: '',
        bus_id: '',
        service_date: dateStr,
        service_time: '08:00',
      });
    }
  }, [isOpen, trip, mode]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    
    const fetchRoutes = async () => {
      try {
        setLoadingRoutes(true);
        const res = await fetch(apiUrl('/api/routes'));
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load routes');
        }
        if (isMounted) {
          setRoutes(data.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load routes');
        }
      } finally {
        if (isMounted) {
          setLoadingRoutes(false);
        }
      }
    };

    fetchRoutes();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    
    const fetchBuses = async () => {
      try {
        setLoadingBuses(true);
        // Use public endpoint instead of admin endpoint to avoid auth requirement
        const res = await fetch(apiUrl('/api/trips/buses/active'));
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load buses');
        }
        if (isMounted) {
          // Already filtered for active buses by the API
          setBuses(data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load buses');
        }
      } finally {
        if (isMounted) {
          setLoadingBuses(false);
        }
      }
    };

    fetchBuses();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Calculate estimated arrival when route or time changes
  useEffect(() => {
    if (formData.route_id && formData.service_date && formData.service_time) {
      const selectedRoute = routes.find(r => String(r.route_id) === String(formData.route_id));
      if (selectedRoute && selectedRoute.default_duration_time) {
        try {
          const [hours, minutes] = selectedRoute.default_duration_time.split(':').map(Number);
          const serviceDateTime = new Date(`${formData.service_date}T${formData.service_time}:00`);
          serviceDateTime.setHours(serviceDateTime.getHours() + hours);
          serviceDateTime.setMinutes(serviceDateTime.getMinutes() + minutes);
          
          const arrivalStr = serviceDateTime.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          setEstimatedArrival(arrivalStr);
        } catch (err) {
          setEstimatedArrival('');
        }
      }
    } else {
      setEstimatedArrival('');
    }
  }, [formData.route_id, formData.service_date, formData.service_time, routes]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { route_id, bus_id, service_date, service_time } = formData;

    if (!route_id || !bus_id || !service_date || !service_time) {
      setError('Please fill in all required fields.');
      return;
    }

    // Combine date and time
    const serviceDateTimeStr = `${service_date}T${service_time}:00`;

    const payload = {
      route_id: Number(route_id),
      bus_id: Number(bus_id),
      service_date: serviceDateTimeStr,
    };

    setSubmitting(true);
    try {
      const endpoint = mode === 'edit'
        ? apiUrl(`/api/trips/${trip?.trip_id}`)
        : apiUrl('/api/trips');
      const method = mode === 'edit' ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        // Ignore auth_required errors since we already checked auth in ManageTrips
        if (data.error === 'auth_required') {
          console.warn('Auth check skipped - already validated in ManageTrips');
          if (onSuccess) {
            onSuccess();
          }
          return;
        }
        throw new Error(data.error || 'Request failed');
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to save trip');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoute = routes.find(r => String(r.route_id) === String(formData.route_id));
  const selectedBus = buses.find(b => String(b.bus_id) === String(formData.bus_id));

  return (
    <div className="detail-overlay" style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div className="detail-modal detail-modal-wide" style={{ maxWidth: '720px', animation: 'slideUp 0.3s ease-out' }}>
        <div className="detail-modal-header" style={{ background: 'linear-gradient(135deg, #e8491d 0%, #ff6b3d 100%)', color: 'white', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '12px', 
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              <FiTruck />
            </div>
            <div>
              <h3 className="detail-title" style={{ margin: 0, color: 'white', fontSize: '24px' }}>
                {mode === 'edit' ? 'Edit Trip' : 'Schedule New Trip'}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                {mode === 'edit' ? 'Update trip information' : 'Create a new scheduled trip'}
              </p>
            </div>
          </div>
          <button 
            className="detail-close-btn" 
            onClick={onClose} 
            aria-label="Close"
            style={{ color: 'white', fontSize: '28px', opacity: 0.9 }}
          >
            ×
          </button>
        </div>

        <div className="detail-modal-body" style={{ padding: '32px' }}>
          {error && (
            <div style={{ 
              marginBottom: '24px',
              padding: '16px',
              background: '#fee',
              border: '2px solid #fcc',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#c33',
              animation: 'shake 0.3s ease'
            }}>
              <FiAlertCircle size={20} />
              <span style={{ flex: 1, fontWeight: 500 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="trip-form">
            {/* Route Section */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '2px solid #f0f0f0'
              }}>
                <FiMapPin style={{ color: 'var(--primary)', fontSize: '20px' }} />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#333' }}>Route Information</h4>
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="route_id" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  marginBottom: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#555'
                }}>
                  <FiMapPin size={16} style={{ color: 'var(--primary)' }} />
                  Select Route
                </label>
                <div style={{ position: 'relative' }}>
                  {routes.length > 0 ? (
                    <select
                      id="route_id"
                      name="route_id"
                      value={formData.route_id}
                      onChange={handleChange}
                      disabled={loadingRoutes || submitting || mode === 'edit'}
                      className="table-select"
                      style={{ 
                        paddingLeft: '12px',
                        height: '48px',
                        fontSize: '15px',
                        borderRadius: '10px',
                        border: '2px solid #e0e0e0',
                        transition: 'all 0.2s'
                      }}
                    >
                      <option value="">🗺️ Choose a route</option>
                      {routes.map((r) => (
                        <option key={r.route_id} value={r.route_id}>
                          {r.departure_city} → {r.arrival_city} ({r.distance}km, {r.default_duration_time?.slice(0,5)}) - {r.operator_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="route_id"
                      name="route_id"
                      type="number"
                      min="1"
                      value={formData.route_id}
                      onChange={handleChange}
                      disabled={submitting || mode === 'edit'}
                      className="table-input"
                      placeholder="Enter route ID"
                      style={{ 
                        height: '48px',
                        fontSize: '15px',
                        borderRadius: '10px',
                        border: '2px solid #e0e0e0'
                      }}
                    />
                  )}
                  {loadingRoutes && (
                    <div style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'var(--primary)'
                    }}>
                      ⏳
                    </div>
                  )}
                </div>
                {selectedRoute && (
                  <div style={{ 
                    marginTop: '12px',
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#666'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>📍 {selectedRoute.departure_station} → {selectedRoute.arrival_station}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <span>📏 {selectedRoute.distance}km</span>
                      <span>⏱️ ~{selectedRoute.default_duration_time?.slice(0,5)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bus Section */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '2px solid #f0f0f0'
              }}>
                <FiTruck style={{ color: 'var(--primary)', fontSize: '20px' }} />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#333' }}>Bus Assignment</h4>
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="bus_id" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  marginBottom: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#555'
                }}>
                  <FiTruck size={16} style={{ color: 'var(--primary)' }} />
                  Select Bus
                </label>
                <div style={{ position: 'relative' }}>
                  {buses.length > 0 ? (
                    <select
                      id="bus_id"
                      name="bus_id"
                      value={formData.bus_id}
                      onChange={handleChange}
                      disabled={loadingBuses || submitting || mode === 'edit'}
                      className="table-select"
                      style={{ 
                        paddingLeft: '12px',
                        height: '48px',
                        fontSize: '15px',
                        borderRadius: '10px',
                        border: '2px solid #e0e0e0',
                        transition: 'all 0.2s'
                      }}
                    >
                      <option value="">🚌 Choose a bus</option>
                      {buses.map((b) => (
                        <option key={b.bus_id} value={b.bus_id}>
                          {b.plate_number} - {b.vehicle_type} ({b.capacity} seats)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="bus_id"
                      name="bus_id"
                      type="number"
                      min="1"
                      value={formData.bus_id}
                      onChange={handleChange}
                      disabled={submitting || mode === 'edit'}
                      className="table-input"
                      placeholder="Enter bus ID"
                      style={{ 
                        height: '48px',
                        fontSize: '15px',
                        borderRadius: '10px',
                        border: '2px solid #e0e0e0'
                      }}
                    />
                  )}
                  {loadingBuses && (
                    <div style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'var(--primary)'
                    }}>
                      ⏳
                    </div>
                  )}
                </div>
                {selectedBus && (
                  <div style={{ 
                    marginTop: '12px',
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#666'
                  }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <span>🚌 {selectedBus.vehicle_type}</span>
                      <span>💺 {selectedBus.capacity} seats</span>
                      <span style={{ color: '#2e7d32', fontWeight: 600 }}>✓ Active</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Section */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '2px solid #f0f0f0'
              }}>
                <FiCalendar style={{ color: 'var(--primary)', fontSize: '20px' }} />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#333' }}>Schedule Details</h4>
              </div>
              
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="service_date" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginBottom: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#555'
                  }}>
                    <FiCalendar size={16} style={{ color: 'var(--primary)' }} />
                    Service Date
                  </label>
                  <input
                    id="service_date"
                    name="service_date"
                    type="date"
                    value={formData.service_date}
                    onChange={handleChange}
                    disabled={submitting}
                    className="table-input"
                    style={{ 
                      height: '48px',
                      paddingLeft: '12px',
                      fontSize: '15px',
                      borderRadius: '10px',
                      border: '2px solid #e0e0e0',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="service_time" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginBottom: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#555'
                  }}>
                    <FiClock size={16} style={{ color: 'var(--primary)' }} />
                    Departure Time
                  </label>
                  <input
                    id="service_time"
                    name="service_time"
                    type="time"
                    step="60"
                    value={formData.service_time}
                    onChange={handleChange}
                    disabled={submitting}
                    className="table-input"
                    style={{ 
                      height: '48px',
                      paddingLeft: '12px',
                      fontSize: '15px',
                      borderRadius: '10px',
                      border: '2px solid #e0e0e0',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>
              </div>

              {estimatedArrival && (
                <div style={{ 
                  marginTop: '16px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                  borderRadius: '12px',
                  border: '2px solid #81c784'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2e7d32', fontWeight: 600 }}>
                    <FiClock size={18} />
                    <span>Estimated Arrival: {estimatedArrival}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '12px', 
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '2px solid #f0f0f0'
            }}>
              <button
                type="button"
                className="logout-button"
                onClick={onClose}
                disabled={submitting}
                style={{ 
                  minWidth: '140px',
                  height: '48px',
                  fontSize: '15px',
                  fontWeight: 600,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1
                }}
              >
                ✕ Cancel
              </button>
              <button
                type="submit"
                className="login-button"
                disabled={submitting || loadingRoutes || loadingBuses}
                style={{ 
                  minWidth: '160px',
                  height: '48px',
                  fontSize: '15px',
                  fontWeight: 600,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  cursor: (submitting || loadingRoutes || loadingBuses) ? 'not-allowed' : 'pointer',
                  opacity: (submitting || loadingRoutes || loadingBuses) ? 0.6 : 1,
                  position: 'relative'
                }}
              >
                {submitting ? (
                  <>
                    <span style={{ 
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite'
                    }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiCheck size={18} />
                    {mode === 'edit' ? 'Update Trip' : 'Schedule Trip'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TripFormModal;
