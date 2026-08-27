import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { apiUrl } from '../../utils/api';

const SeatSelector = ({ trip, onClose, onConfirm }) => {
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generate seat layout based on vehicle type and capacity
  const generateSeatLayout = () => {
    if (!trip) return [];
    
    const capacity = trip.capacity || 40;
    const vehicleType = trip.vehicle_type || 'Seater';
    
    // Different layouts for different vehicle types
    if (vehicleType === 'Sleeper') {
      // 2 columns layout for sleeper bus (beds)
      const rows = Math.ceil(capacity / 2);
      const layout = [];
      let seatNum = 1;
      
      for (let row = 0; row < rows; row++) {
        layout.push([
          { code: `S${seatNum}`, type: 'sleeper' },
          { code: `S${seatNum + 1}`, type: 'sleeper' }
        ]);
        seatNum += 2;
      }
      return layout;
    } else if (vehicleType === 'Limousine') {
      // 3 columns layout for limousine (luxury seats)
      const rows = Math.ceil(capacity / 3);
      const layout = [];
      let seatNum = 1;
      
      for (let row = 0; row < rows; row++) {
        layout.push([
          { code: `L${seatNum}`, type: 'limousine' },
          { code: `L${seatNum + 1}`, type: 'limousine' },
          { code: `L${seatNum + 2}`, type: 'limousine' }
        ]);
        seatNum += 3;
      }
      return layout;
    } else {
      // Default 4 columns layout for regular seater (2-2 configuration)
      const rows = Math.ceil(capacity / 4);
      const layout = [];
      let seatNum = 1;
      
      for (let row = 0; row < rows; row++) {
        layout.push([
          { code: `A${seatNum}`, type: 'seat' },
          { code: `A${seatNum + 1}`, type: 'seat' },
          null, // aisle
          { code: `B${seatNum}`, type: 'seat' },
          { code: `B${seatNum + 1}`, type: 'seat' }
        ]);
        seatNum += 2;
      }
      return layout;
    }
  };

  // Fetch booked seats for this trip
  useEffect(() => {
    const fetchBookedSeats = async () => {
      try {
        setLoading(true);
          const response = await fetch(apiUrl(`/api/trips/${trip.trip_id}/booked-seats`));
        
        if (response.ok) {
          const data = await response.json();
          setBookedSeats(data.booked_seats || []);
        }
      } catch (error) {
        console.error('Error fetching booked seats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (trip) {
      fetchBookedSeats();
    }
  }, [trip]);

  const toggleSeat = (seatCode) => {
    if (bookedSeats.includes(seatCode)) {
      return; // Can't select already booked seat
    }

    setSelectedSeats(prev => {
      if (prev.includes(seatCode)) {
        return prev.filter(s => s !== seatCode);
      } else {
        return [...prev, seatCode];
      }
    });
  };

  const getSeatStatus = (seatCode) => {
    if (bookedSeats.includes(seatCode)) return 'booked';
    if (selectedSeats.includes(seatCode)) return 'selected';
    return 'available';
  };

  const handleConfirm = () => {
    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất một ghế');
      return;
    }
    onConfirm(selectedSeats);
  };

  const seatLayout = generateSeatLayout();
  const totalPrice = selectedSeats.length * (trip?.price || 0);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(Number(val));
  };

  return (
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
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '30px',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: '2px solid #f0f0f0'
        }}>
          <div>
            <h2 style={{ 
              color: 'var(--futa-orange)', 
              margin: 0,
              fontSize: '1.5rem'
            }}>
              Chọn Ghế
            </h2>
            <p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '0.9rem' }}>
              {trip?.route_name} - {trip?.vehicle_type}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '2rem',
              cursor: 'pointer',
              color: '#999',
              padding: '0',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FiX />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Đang tải sơ đồ ghế...</p>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div style={{
              display: 'flex',
              gap: '20px',
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: '#4caf50',
                  borderRadius: '4px',
                  border: '2px solid #4caf50'
                }}></div>
                <span style={{ fontSize: '0.9rem' }}>Có sẵn</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: 'var(--futa-orange)',
                  borderRadius: '4px',
                  border: '2px solid var(--futa-orange)'
                }}></div>
                <span style={{ fontSize: '0.9rem' }}>Đang chọn</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '4px',
                  border: '2px solid #ccc'
                }}></div>
                <span style={{ fontSize: '0.9rem' }}>Đã đặt</span>
              </div>
            </div>

            {/* Seat Layout */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              {/* Driver indicator */}
              <div style={{
                textAlign: 'right',
                marginBottom: '10px',
                paddingRight: '10px'
              }}>
                <div style={{
                  display: 'inline-block',
                  padding: '5px 15px',
                  backgroundColor: '#666',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.8rem'
                }}>
                  🚗 Tài xế
                </div>
              </div>

              {seatLayout.map((row, rowIndex) => (
                <div key={rowIndex} style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center'
                }}>
                  {row.map((seat, seatIndex) => {
                    if (!seat) {
                      // Aisle
                      return <div key={seatIndex} style={{ width: '40px' }}></div>;
                    }

                    const status = getSeatStatus(seat.code);
                    const isBooked = status === 'booked';
                    const isSelected = status === 'selected';

                    return (
                      <button
                        key={seatIndex}
                        onClick={() => toggleSeat(seat.code)}
                        disabled={isBooked}
                        style={{
                          width: '50px',
                          height: '50px',
                          border: `2px solid ${
                            isBooked ? '#ccc' : 
                            isSelected ? 'var(--futa-orange)' : 
                            '#4caf50'
                          }`,
                          backgroundColor: isBooked ? '#e0e0e0' : 
                                          isSelected ? 'var(--futa-orange)' : 
                                          '#4caf50',
                          color: isBooked ? '#999' : 'white',
                          borderRadius: '4px',
                          cursor: isBooked ? 'not-allowed' : 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          transition: 'all 0.2s',
                          opacity: isBooked ? 0.5 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!isBooked) {
                            e.target.style.transform = 'scale(1.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        {seat.code}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Selected Seats Summary */}
            <div style={{
              backgroundColor: '#fff8f0',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#333' }}>Ghế đã chọn:</strong>
                <span style={{ marginLeft: '10px', color: '#666' }}>
                  {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn ghế'}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '10px',
                borderTop: '1px solid #f0e0c0'
              }}>
                <span style={{ fontSize: '1rem', color: '#333' }}>
                  Tổng tiền ({selectedSeats.length} ghế):
                </span>
                <span style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold',
                  color: 'var(--futa-orange)'
                }}>
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: '12px 30px',
                  fontSize: '1rem',
                  backgroundColor: '#fff',
                  color: '#666',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleConfirm}
                className="login-button"
                style={{
                  padding: '12px 30px',
                  fontSize: '1rem'
                }}
                disabled={selectedSeats.length === 0}
              >
                Xác nhận ({selectedSeats.length} ghế)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SeatSelector;
