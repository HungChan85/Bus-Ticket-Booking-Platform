import React, { useEffect, useMemo, useState } from 'react';
import { FiMapPin, FiTrendingUp, FiClock, FiUsers, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { apiUrl } from '../../utils/api';

const RouteFormModal = ({
  isOpen,
  mode = 'create',
  route,
  onClose,
  onSuccess,
  operatorOptions = [],
}) => {
  const [formData, setFormData] = useState({
    departure_station_id: '',
    arrival_station_id: '',
    distance: '',
    default_duration_time: '',
    operator_id: '',
    price: '',
  });
  const [stations, setStations] = useState([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const baseDuration = route?.default_duration_time || '';
    setFormData({
      departure_station_id: String(route?.departure_station_id || ''),
      arrival_station_id: String(route?.arrival_station_id || ''),
      distance: route?.distance || '',
      default_duration_time: baseDuration ? baseDuration.slice(0, 5) : '',
      operator_id: String(route?.operator_id || ''),
      price: route?.price || '',
    });
  }, [isOpen, route, mode]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const fetchStations = async () => {
      try {
        setLoadingStations(true);
        const res = await fetch(apiUrl('/api/schedule/stations'));
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load stations');
        }
        if (isMounted) {
          setStations(data.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load stations');
        }
      } finally {
        if (isMounted) {
          setLoadingStations(false);
        }
      }
    };

    fetchStations();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const operatorChoices = useMemo(() => {
    const seen = new Set();
    const ops = [];
    operatorOptions.forEach((op) => {
      if (op?.operator_id && !seen.has(op.operator_id)) {
        seen.add(op.operator_id);
        ops.push(op);
      }
    });
    return ops;
  }, [operatorOptions]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { departure_station_id, arrival_station_id, distance, default_duration_time, operator_id, price } = formData;

    if (!departure_station_id || !arrival_station_id || !distance || !default_duration_time || !operator_id) {
      setError('Please fill in all required fields.');
      return;
    }

    if (price && (Number.isNaN(Number(price)) || Number(price) < 0)) {
      setError('Price must be a valid positive number.');
      return;
    }

    if (departure_station_id === arrival_station_id) {
      setError('Departure and arrival stations must be different.');
      return;
    }

    const distanceValue = Number(distance);
    if (Number.isNaN(distanceValue) || distanceValue <= 0) {
      setError('Distance must be a positive number.');
      return;
    }

    const normalizedDuration = default_duration_time.length === 5
      ? `${default_duration_time}:00`
      : default_duration_time;

    const payload = {
      departure_station_id: Number(departure_station_id),
      arrival_station_id: Number(arrival_station_id),
      distance: distanceValue,
      default_duration_time: normalizedDuration,
      operator_id: operator_id,
    };

    if (price) {
      payload.price = Number(price);
    }

    setSubmitting(true);
    try {
      const endpoint = mode === 'edit'
        ? apiUrl(`/api/routes/${route?.route_id}`)
        : apiUrl('/api/routes');
      const method = mode === 'edit' ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to save route');
    } finally {
      setSubmitting(false);
    }
  };

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
              <FiMapPin />
            </div>
            <div>
              <h3 className="detail-title" style={{ margin: 0, color: 'white', fontSize: '24px' }}>
                {mode === 'edit' ? 'Edit Route' : 'Create New Route'}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                {mode === 'edit' ? 'Update route information' : 'Add a new route to the system'}
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

          <form onSubmit={handleSubmit} className="route-form">
            {/* Stations Section */}
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
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#333' }}>Route Stations</h4>
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="departure_station_id" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginBottom: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#555'
                  }}>
                    <span style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      background: '#e8f5e9',
                      color: '#2e7d32',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>A</span>
                    Departure Station
                  </label>
                  <div style={{ position: 'relative' }}>
                    {stations.length > 0 ? (
                      <select
                        id="departure_station_id"
                        name="departure_station_id"
                        value={formData.departure_station_id}
                        onChange={handleChange}
                        disabled={loadingStations || submitting}
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
                        <option value="">🚏 Select departure station</option>
                        {stations.map((s) => (
                          <option key={s.station_id} value={s.station_id}>
                            📍 {s.city} - {s.station_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="departure_station_id"
                        name="departure_station_id"
                        type="number"
                        min="1"
                        value={formData.departure_station_id}
                        onChange={handleChange}
                        disabled={submitting}
                        className="table-input"
                        placeholder="Enter station ID"
                        style={{ 
                          height: '48px',
                          fontSize: '15px',
                          borderRadius: '10px',
                          border: '2px solid #e0e0e0'
                        }}
                      />
                    )}
                    {loadingStations && (
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
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="arrival_station_id" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginBottom: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#555'
                  }}>
                    <span style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      background: '#ffebee',
                      color: '#c62828',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>B</span>
                    Arrival Station
                  </label>
                  <div style={{ position: 'relative' }}>
                    {stations.length > 0 ? (
                      <select
                        id="arrival_station_id"
                        name="arrival_station_id"
                        value={formData.arrival_station_id}
                        onChange={handleChange}
                        disabled={loadingStations || submitting}
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
                        <option value="">🏁 Select arrival station</option>
                        {stations.map((s) => (
                          <option key={s.station_id} value={s.station_id}>
                            📍 {s.city} - {s.station_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="arrival_station_id"
                        name="arrival_station_id"
                        type="number"
                        min="1"
                        value={formData.arrival_station_id}
                        onChange={handleChange}
                        disabled={submitting}
                        className="table-input"
                        placeholder="Enter station ID"
                        style={{ 
                          height: '48px',
                          fontSize: '15px',
                          borderRadius: '10px',
                          border: '2px solid #e0e0e0'
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Route Details Section */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '2px solid #f0f0f0'
              }}>
                <FiTrendingUp style={{ color: 'var(--primary)', fontSize: '20px' }} />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#333' }}>Route Details</h4>
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="distance" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginBottom: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#555'
                  }}>
                    <FiTrendingUp size={16} style={{ color: 'var(--primary)' }} />
                    Distance (km)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="distance"
                      name="distance"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.distance}
                      onChange={handleChange}
                      disabled={submitting}
                      className="table-input"
                      placeholder="e.g. 150.5"
                      style={{ 
                        height: '48px',
                        paddingLeft: '12px',
                        fontSize: '15px',
                        borderRadius: '10px',
                        border: '2px solid #e0e0e0',
                        transition: 'all 0.2s'
                      }}
                    />
                    <span style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: '#999',
                      fontSize: '14px',
                      fontWeight: 600
                    }}>km</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="default_duration_time" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginBottom: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#555'
                  }}>
                    <FiClock size={16} style={{ color: 'var(--primary)' }} />
                    Default Duration
                  </label>
                  <div>
                    <input
                      id="default_duration_time"
                      name="default_duration_time"
                      type="time"
                      step="60"
                      value={formData.default_duration_time}
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
                    <small style={{ 
                      display: 'block',
                      marginTop: '6px',
                      color: '#999',
                      fontSize: '12px'
                    }}>⏱️ Format: HH:MM (e.g. 02:30)</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Section */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '2px solid #f0f0f0'
              }}>
                <span style={{ fontSize: '20px' }}>💰</span>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#333' }}>Pricing</h4>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="price" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  marginBottom: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#555'
                }}>
                  <span style={{ fontSize: '16px' }}>💵</span>
                  Base Price (VND)
                  <span style={{ 
                    fontSize: '11px',
                    color: '#999',
                    fontWeight: 400,
                    fontStyle: 'italic'
                  }}>(Optional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.price}
                    onChange={handleChange}
                    disabled={submitting}
                    className="table-input"
                    placeholder="e.g. 150000"
                    style={{ 
                      height: '48px',
                      paddingLeft: '12px',
                      fontSize: '15px',
                      borderRadius: '10px',
                      border: '2px solid #e0e0e0',
                      transition: 'all 0.2s'
                    }}
                  />
                  <span style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: 'var(--futa-orange)',
                    fontSize: '14px',
                    fontWeight: 600
                  }}>₫</span>
                </div>
                <small style={{ 
                  display: 'block',
                  marginTop: '6px',
                  color: '#999',
                  fontSize: '12px'
                }}>💡 Base fare for this route (creates/updates fare entry)</small>
              </div>
            </div>

            {/* Operator Section */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '2px solid #f0f0f0'
              }}>
                <FiUsers style={{ color: 'var(--primary)', fontSize: '20px' }} />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#333' }}>Operator</h4>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="operator_id" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  marginBottom: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#555'
                }}>
                  <FiUsers size={16} style={{ color: 'var(--primary)' }} />
                  Bus Operator
                </label>
                {operatorChoices.length > 0 ? (
                  <select
                    id="operator_id"
                    name="operator_id"
                    value={formData.operator_id}
                    onChange={handleChange}
                    disabled={submitting}
                    className="table-select"
                    style={{ 
                      height: '48px',
                      paddingLeft: '12px',
                      fontSize: '15px',
                      borderRadius: '10px',
                      border: '2px solid #e0e0e0',
                      transition: 'all 0.2s'
                    }}
                  >
                    <option value="">🚌 Select bus operator</option>
                    {operatorChoices.map((op) => (
                      <option key={op.operator_id} value={op.operator_id}>
                        🏢 {op.operator_name} (ID: {op.operator_id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="operator_id"
                    name="operator_id"
                    type="text"
                    value={formData.operator_id}
                    onChange={handleChange}
                    disabled={submitting}
                    className="table-input"
                    placeholder="Enter operator ID (e.g. OP001)"
                    style={{ 
                      height: '48px',
                      paddingLeft: '12px',
                      fontSize: '15px',
                      borderRadius: '10px',
                      border: '2px solid #e0e0e0'
                    }}
                  />
                )}
              </div>
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
                disabled={submitting || loadingStations}
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
                  cursor: (submitting || loadingStations) ? 'not-allowed' : 'pointer',
                  opacity: (submitting || loadingStations) ? 0.6 : 1,
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
                    {mode === 'edit' ? 'Update Route' : 'Create Route'}
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

export default RouteFormModal;
