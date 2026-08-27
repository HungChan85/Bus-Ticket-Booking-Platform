import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { FiUser, FiMail, FiPhone, FiCalendar, FiCreditCard, FiFileText, FiClock } from 'react-icons/fi';
import { apiUrl } from '../utils/api';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('info'); // 'info' or 'tickets'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      alert('Please login to view your profile');
      navigate('/login');
      return;
    }

    try {
      const userData = JSON.parse(loggedInUser);
      const accountId = userData.accountId;

      // Fetch user profile data
      fetch(apiUrl(`/api/profile/${accountId}`))
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setUser(data.data);
          } else {
            setError('Failed to load profile data');
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching profile:', err);
          setError('Failed to load profile data');
          setLoading(false);
        });

      // Fetch user tickets
      fetch(apiUrl(`/api/profile/${accountId}/tickets`))
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setTickets(data.data);
          } else {
            console.error('Failed to load tickets');
          }
        })
        .catch(err => {
          console.error('Error fetching tickets:', err);
        });
    } catch (e) {
      console.error('Failed to parse user data:', e);
      setError('Invalid user data');
      setLoading(false);
    }
  }, [navigate]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(Number(val));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Not Used':
        return '#4caf50';
      case 'In Use':
        return '#2196f3';
      case 'Completed':
        return '#9c27b0';
      case 'Cancelled':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const getStatusLabel = (status) => {
    // Status already in English from backend
    return status;
  };

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ padding: '40px', textAlign: 'center', minHeight: '60vh' }}>
          <p>Loading profile...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !user) {
    return (
      <>
        <Header />
        <div style={{ padding: '40px', textAlign: 'center', color: 'red', minHeight: '60vh' }}>
          <p>{error || 'Failed to load profile'}</p>
          <button onClick={() => navigate('/')} className="login-button" style={{ marginTop: '20px' }}>
            Go to Homepage
          </button>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="page-container" style={{ minHeight: '80vh', padding: '40px 20px', background: '#f5f5f5' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Page Header */}
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{ 
              color: 'var(--futa-orange)', 
              fontSize: '2rem',
              marginBottom: '10px'
            }}>
              My Profile
            </h1>
            <p style={{ color: '#666', fontSize: '1rem' }}>
              Manage your account information and view your booking history
            </p>
          </div>

          {/* Profile Card */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            marginBottom: '30px'
          }}>
            {/* User Avatar & Basic Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '30px',
              paddingBottom: '30px',
              borderBottom: '2px solid #f0f0f0',
              marginBottom: '30px'
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #e8491d 0%, #ff6b3d 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3rem',
                color: 'white',
                fontWeight: 'bold'
              }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ 
                  fontSize: '1.8rem', 
                  color: '#333', 
                  marginBottom: '10px' 
                }}>
                  {user.name}
                </h2>
                <div style={{ 
                  display: 'flex', 
                  gap: '20px', 
                  color: '#666',
                  fontSize: '0.95rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiMail size={16} />
                    <span>{user.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiPhone size={16} />
                    <span>{user.phone}</span>
                  </div>
                </div>
                <div style={{
                  marginTop: '12px',
                  display: 'inline-block',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  background: user.accountStatus === 'Active' ? '#e8f5e9' : '#fff3e0',
                  color: user.accountStatus === 'Active' ? '#2e7d32' : '#e65100',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}>
                  {user.accountStatus === 'Active' ? '✓ Active Account' : user.accountStatus}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '30px',
              borderBottom: '2px solid #e0e0e0'
            }}>
              <button
                onClick={() => setActiveTab('info')}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  background: 'transparent',
                  color: activeTab === 'info' ? 'var(--futa-orange)' : '#666',
                  fontWeight: activeTab === 'info' ? 'bold' : 'normal',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'info' ? '3px solid var(--futa-orange)' : 'none',
                  marginBottom: '-2px',
                  transition: 'all 0.3s'
                }}
              >
                Account Information
              </button>
              <button
                onClick={() => setActiveTab('tickets')}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  background: 'transparent',
                  color: activeTab === 'tickets' ? 'var(--futa-orange)' : '#666',
                  fontWeight: activeTab === 'tickets' ? 'bold' : 'normal',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'tickets' ? '3px solid var(--futa-orange)' : 'none',
                  marginBottom: '-2px',
                  transition: 'all 0.3s'
                }}
              >
                My Tickets ({tickets.length})
              </button>
            </div>

            {/* Account Information Tab */}
            {activeTab === 'info' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '30px'
              }}>
                <div className="info-item">
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    marginBottom: '10px'
                  }}>
                    <FiUser style={{ color: 'var(--futa-orange)', fontSize: '20px' }} />
                    <strong style={{ color: '#333', fontSize: '0.95rem' }}>Full Name</strong>
                  </div>
                  <div style={{ color: '#666', paddingLeft: '30px' }}>
                    {user.name}
                  </div>
                </div>

                <div className="info-item">
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    marginBottom: '10px'
                  }}>
                    <FiMail style={{ color: 'var(--futa-orange)', fontSize: '20px' }} />
                    <strong style={{ color: '#333', fontSize: '0.95rem' }}>Email Address</strong>
                  </div>
                  <div style={{ color: '#666', paddingLeft: '30px' }}>
                    {user.email}
                  </div>
                </div>

                <div className="info-item">
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    marginBottom: '10px'
                  }}>
                    <FiPhone style={{ color: 'var(--futa-orange)', fontSize: '20px' }} />
                    <strong style={{ color: '#333', fontSize: '0.95rem' }}>Phone Number</strong>
                  </div>
                  <div style={{ color: '#666', paddingLeft: '30px' }}>
                    {user.phone}
                  </div>
                </div>

                <div className="info-item">
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    marginBottom: '10px'
                  }}>
                    <FiCalendar style={{ color: 'var(--futa-orange)', fontSize: '20px' }} />
                    <strong style={{ color: '#333', fontSize: '0.95rem' }}>Date of Birth</strong>
                  </div>
                  <div style={{ color: '#666', paddingLeft: '30px' }}>
                    {formatDate(user.dateOfBirth)}
                  </div>
                </div>

                <div className="info-item">
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    marginBottom: '10px'
                  }}>
                    <FiCreditCard style={{ color: 'var(--futa-orange)', fontSize: '20px' }} />
                    <strong style={{ color: '#333', fontSize: '0.95rem' }}>Personal ID</strong>
                  </div>
                  <div style={{ color: '#666', paddingLeft: '30px' }}>
                    {user.govId}
                  </div>
                </div>

                <div className="info-item">
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    marginBottom: '10px'
                  }}>
                    <FiClock style={{ color: 'var(--futa-orange)', fontSize: '20px' }} />
                    <strong style={{ color: '#333', fontSize: '0.95rem' }}>Member Since</strong>
                  </div>
                  <div style={{ color: '#666', paddingLeft: '30px' }}>
                    {formatDate(user.accountCreated)}
                  </div>
                </div>
              </div>
            )}

            {/* My Tickets Tab */}
            {activeTab === 'tickets' && (
              <div>
                {tickets.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: '#999'
                  }}>
                    <FiFileText style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.3 }} />
                    <p style={{ fontSize: '1.1rem' }}>You haven't purchased any tickets yet</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.ticketId}
                        style={{
                          border: '2px solid #e0e0e0',
                          borderRadius: '12px',
                          padding: '24px',
                          background: '#fafafa',
                          transition: 'all 0.3s'
                        }}
                      >
                        {/* Ticket Header */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '20px',
                          paddingBottom: '15px',
                          borderBottom: '1px solid #ddd'
                        }}>
                          <div>
                            <h3 style={{ 
                              color: '#333', 
                              fontSize: '1.3rem',
                              marginBottom: '5px'
                            }}>
                              {ticket.route}
                            </h3>
                            <div style={{ 
                              fontSize: '0.85rem', 
                              color: '#666',
                              display: 'flex',
                              gap: '15px'
                            }}>
                              <span>🎫 {ticket.ticketId}</span>
                              <span>📦 {ticket.bookingId}</span>
                              <span>🔢 {ticket.serialNumber}</span>
                            </div>
                          </div>
                          <div style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            background: getStatusColor(ticket.status),
                            color: 'white',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                          }}>
                            {getStatusLabel(ticket.status)}
                          </div>
                        </div>

                        {/* Ticket Details */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '20px'
                        }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '5px' }}>
                              Departure
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>
                              {formatDateTime(ticket.departureDate)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '5px' }}>
                              Arrival
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>
                              {formatDateTime(ticket.arrivalDate)}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '5px' }}>
                              Seat
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--futa-orange)' }}>
                              {ticket.seatCode}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '5px' }}>
                              Vehicle Type
                            </div>
                            <div style={{ fontSize: '0.95rem', color: '#666' }}>
                              {ticket.vehicleType}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '5px' }}>
                              Operator
                            </div>
                            <div style={{ fontSize: '0.95rem', color: '#666' }}>
                              {ticket.operator}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '5px' }}>
                              Plate Number
                            </div>
                            <div style={{ fontSize: '0.95rem', color: '#666' }}>
                              {ticket.plateNumber}
                            </div>
                          </div>
                        </div>

                        {/* Ticket Footer */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          marginTop: '20px',
                          paddingTop: '15px',
                          borderTop: '1px solid #ddd'
                        }}>
                          <div style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            color: 'var(--futa-orange)'
                          }}>
                            {formatCurrency(ticket.price)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Back Button */}
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button
              onClick={() => navigate('/')}
              className="login-button"
              style={{
                padding: '12px 40px',
                fontSize: '1rem'
              }}
            >
              Back to Homepage
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Profile;
