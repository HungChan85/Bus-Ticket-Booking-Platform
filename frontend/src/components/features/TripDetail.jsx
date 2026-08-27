import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SeatSelector from './SeatSelector';
import { FiNavigation, FiClock, FiCalendar, FiTruck } from 'react-icons/fi';
import { getStoredUser, getAuthHeaders } from '../../utils/auth';
import { apiUrl } from '../../utils/api';
import layoutImg from '../../../assets/images/layout.jpg';

const API_BASE_URL = apiUrl('/api/schedule');
const BOOKING_API_URL = apiUrl('/api/bookings');

const TripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  console.log('TripDetail mounted, tripId:', tripId);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [seatInput, setSeatInput] = useState('');
  const [bookingError, setBookingError] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [showSeatSelector, setShowSeatSelector] = useState(false);
  const [user] = useState(() => getStoredUser());

  useEffect(() => {
    const fetchTripDetail = async () => {
      try {
        setLoading(true);
        // Gọi endpoint mới để lấy chi tiết trip từ database
        const response = await fetch(`${API_BASE_URL}/trips/${tripId}`);
        
        if (!response.ok) {
          throw new Error('Failed to load trip details');
        }
        
        const payload = await response.json();
        
        if (!payload.data) {
          throw new Error('Trip not found');
        }
        
        setTrip(payload.data);
      } catch (err) {
        console.error('Error loading trip details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (tripId) {
      fetchTripDetail();
    }
  }, [tripId]);

  const handleGoBack = () => {
    // Truyền lại search state khi quay về
    const returnPath = location.state?.returnTo || '/schedule';
    const searchState = location.state?.searchState;
    
    navigate(returnPath, {
      state: searchState ? { searchState } : undefined
    });
  };

  const handleConfirmBooking = async () => {
    setBookingError(null);
    const currentUser = user || getStoredUser();

    if (!currentUser?.accountId && !currentUser?.account_id) {
      alert('Please login to continue.');
      navigate('/login', { state: { returnTo: location.pathname } });
      return;
    }

    const seatCodes = seatInput
      .split(/[\,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (seatCodes.length === 0) {
      setBookingError('Please enter at least one seat code (e.g. A1,A2,A3).');
      return;
    }

    if (!trip?.fare_id) {
      setBookingError('Fare information is missing for this trip. Please try again later.');
      return;
    }

    const payload = {
      currency: 'VND',
      account_id: currentUser.accountId || currentUser.account_id,
      operator_id: trip.operator_id,
      trip_id: trip.trip_id,
      fare_id: trip.fare_id,
      seat_codes: seatCodes,
    };

    setBookingLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: getAuthHeaders('application/json'),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Booking failed');
      }

      setBookingResult({
        bookingId: data.booking_id,
        seatCodes: data.seat_codes,
        ticketIds: data.ticket_ids || [],
        ticketSerials: (data.ticket_serials || []).map((t) => t.serial_number),
        amount: trip.price * seatCodes.length,
      });
      setShowSuccessPopup(true);
      setSeatInput('');
      setTrip((prev) =>
        prev
          ? { ...prev, available_seats: Math.max(0, prev.available_seats - seatCodes.length) }
          : prev
      );
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCloseSuccessPopup = () => {
    setShowSuccessPopup(false);
    setBookingResult(null);
    // Có thể redirect về trang khác nếu cần
    // navigate('/my-bookings');
  };

  const handleSeatConfirm = (selectedSeats) => {
    if (selectedSeats && selectedSeats.length > 0) {
      setSeatInput(selectedSeats.join(', '));
      setShowSeatSelector(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(Number(val));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString;
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="container" style={{ minHeight: '60vh', padding: '40px 20px' }}>
          <p>Loading trip details...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !trip) {
    return (
      <>
        <Header />
        <div className="container" style={{ minHeight: '60vh', padding: '40px 20px' }}>
          <h2 style={{ color: '#f26522', marginBottom: '20px' }}>Trip Not Found</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            {error || 'The trip you are looking for does not exist.'}
          </p>
          <button className="login-button" onClick={handleGoBack}>
            Back to Schedule
          </button>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container" style={{ minHeight: '70vh', padding: '40px 20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Header section */}
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{ 
              color: 'var(--futa-orange)', 
              fontSize: '2rem',
              marginBottom: '10px'
            }}>
              Trip Details
            </h1>
            <p style={{ color: '#666', fontSize: '1rem' }}>
              Review the trip information before booking
            </p>
          </div>

          {/* Main trip detail card */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            marginBottom: '20px'
          }}>
            {/* Route & Timing */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '30px',
              paddingBottom: '20px',
              borderBottom: '2px solid #f0f0f0'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>
                  {formatTime(trip.time_start)}
                </div>
                <div style={{ fontSize: '1.1rem', color: '#666', marginTop: '5px' }}>
                  {trip.station_name}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#999', marginTop: '3px' }}>
                  {trip.city}
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                padding: '0 20px'
              }}>
                <FiNavigation style={{ fontSize: '1.5rem', color: 'var(--futa-orange)' }} />
                <div style={{ 
                  fontSize: '0.9rem', 
                  color: '#666',
                  margin: '8px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <FiClock size={14} />
                  {trip.duration}
                </div>
              </div>

              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>
                  {formatTime(trip.time_end)}
                </div>
                <div style={{ fontSize: '1.1rem', color: '#666', marginTop: '5px' }}>
                  {trip.arrival_city || trip.route_name}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#999', marginTop: '3px' }}>
                  Arrival
                </div>
              </div>
            </div>

            {/* Trip Information Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '20px',
              marginBottom: '25px'
            }}>
              <div className="info-item">
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <FiCalendar style={{ color: 'var(--futa-orange)' }} />
                  <strong style={{ color: '#333' }}>Departure Date</strong>
                </div>
                <div style={{ color: '#666', paddingLeft: '26px' }}>
                  {formatDate(trip.service_date)}
                </div>
              </div>

              <div className="info-item">
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <FiTruck style={{ color: 'var(--futa-orange)' }} />
                  <strong style={{ color: '#333' }}>Vehicle Type</strong>
                </div>
                <div style={{ color: '#666', paddingLeft: '26px' }}>
                  {trip.vehicle_type}
                </div>
              </div>

              <div className="info-item">
                <strong style={{ color: '#333' }}>Operator</strong>
                <div style={{ color: '#666', marginTop: '5px' }}>
                  {trip.brand_name}
                </div>
              </div>

              <div className="info-item">
                <strong style={{ color: '#333' }}>Bus Plate Number</strong>
                <div style={{ color: '#666', marginTop: '5px' }}>
                  {trip.plate_number || 'N/A'}
                </div>
              </div>

              <div className="info-item">
                <strong style={{ color: '#333' }}>Distance</strong>
                <div style={{ color: '#666', marginTop: '5px' }}>
                  {trip.distance ? `${trip.distance} km` : 'N/A'}
                </div>
              </div>

              <div className="info-item">
                <strong style={{ color: '#333' }}>Available Seats</strong>
                <div style={{ 
                  color: trip.available_seats > 10 ? '#4caf50' : '#f44336',
                  marginTop: '5px',
                  fontWeight: 'bold'
                }}>
                  {trip.available_seats} seats
                </div>
              </div>
            </div>

            {/* Price Section */}
            <div style={{
              backgroundColor: '#fff8f0',
              padding: '20px',
              borderRadius: '8px',
              marginTop: '20px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '1.1rem', color: '#333' }}>
                  Ticket Price
                </span>
                <span style={{ 
                  fontSize: '1.8rem', 
                  fontWeight: 'bold',
                  color: 'var(--futa-orange)'
                }}>
                  {formatCurrency(trip.price)}
                </span>
              </div>
            </div>
          </div>

          {/* Booking input */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            marginTop: '10px'
          }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>Booking Details</h3>
            <div style={{ marginBottom: '12px' }}>
              <img
                src={layoutImg}
                alt="Seat layout"
                style={{
                  width: '100%',
                  maxHeight: '320px',
                  objectFit: 'contain',
                  borderRadius: '10px',
                  border: '1px solid #eee'
                }}
              />
            </div>
            <p style={{ color: '#666', marginBottom: '10px' }}>
              Enter the seat codes you want to book (comma or space separated).
            </p>
            <input
              type="text"
              value={seatInput}
              onChange={(e) => setSeatInput(e.target.value)}
              placeholder="e.g. A1, A2, A3"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '1rem',
                marginBottom: '10px',
              }}
              disabled={bookingLoading}
            />
            {bookingError && (
              <div style={{ color: '#d32f2f', marginBottom: '10px', fontSize: '0.95rem' }}>
                {bookingError}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'center',
            marginTop: '30px'
          }}>
            <button
              onClick={handleGoBack}
              style={{
                padding: '12px 30px',
                fontSize: '1rem',
                backgroundColor: '#fff',
                color: '#666',
                border: '2px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#999';
                e.target.style.color = '#333';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#ddd';
                e.target.style.color = '#666';
              }}
            >
              Back to Trip List
            </button>

            <button
              onClick={handleConfirmBooking}
              className="login-button"
              style={{
                padding: '12px 40px',
                fontSize: '1rem',
              }}
              disabled={bookingLoading}
            >
              {bookingLoading ? 'Processing...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      </div>
      <Footer />

      {/* Payment Success Popup */}
      {showSuccessPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '450px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            {/* Success Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: '#4caf50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg 
                width="50" 
                height="50" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            <h2 style={{ 
              color: '#4caf50', 
              marginBottom: '15px',
              fontSize: '1.8rem'
            }}>
              Payment Successful!
            </h2>
            <p style={{ color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
              Your booking has been confirmed.<br />
              Details have been sent to your email.
            </p>
            
            <div style={{
              backgroundColor: '#f5f5f5',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '25px',
              textAlign: 'left'
            }}>
              {bookingResult?.bookingId && (
                <div style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#333' }}>Booking ID:</strong>
                  <span style={{ marginLeft: '10px', color: 'var(--futa-orange)', fontWeight: 'bold' }}>
                    #{bookingResult.bookingId}
                  </span>
                </div>
              )}
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#333' }}>Trip Code:</strong>
                <span style={{ marginLeft: '10px', color: '#666' }}>#{trip.trip_id}</span>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#333' }}>Route:</strong>
                <span style={{ marginLeft: '10px', color: '#666' }}>{trip.route_name}</span>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#333' }}>Departure Date:</strong>
                <span style={{ marginLeft: '10px', color: '#666' }}>{formatDate(trip.service_date)}</span>
              </div>
              <div>
                <strong style={{ color: '#333' }}>Total Amount:</strong>
                <span style={{ marginLeft: '10px', color: 'var(--futa-orange)', fontWeight: 'bold' }}>
                  {formatCurrency(bookingResult?.amount || trip.price)}
                </span>
              </div>
              {bookingResult?.seatCodes && (
                <div style={{ marginTop: '10px' }}>
                  <strong style={{ color: '#333' }}>Seats:</strong>
                  <span style={{ marginLeft: '10px', color: '#666' }}>
                    {bookingResult.seatCodes.join(', ')}
                  </span>
                </div>
              )}
              {bookingResult?.ticketSerials?.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <strong style={{ color: '#333' }}>Ticket Serials:</strong>
                  <span style={{ marginLeft: '10px', color: '#666' }}>
                    {bookingResult.ticketSerials.join(', ')}
                  </span>
                </div>
              )}
              {bookingResult?.bookingId && (
                <div style={{ marginTop: '6px' }}>
                  <strong style={{ color: '#333' }}>Booking ID:</strong>
                  <span style={{ marginLeft: '10px', color: '#666' }}>
                    {bookingResult.bookingId}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleCloseSuccessPopup}
              className="login-button"
              style={{
                padding: '12px 40px',
                fontSize: '1rem',
                width: '100%'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Seat Selector Modal */}
      {showSeatSelector && (
        <SeatSelector
          trip={trip}
          onClose={() => setShowSeatSelector(false)}
          onConfirm={handleSeatConfirm}
        />
      )}
    </>
  );
};

export default TripDetail;
