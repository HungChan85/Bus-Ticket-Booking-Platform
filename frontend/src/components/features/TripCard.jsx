import React from 'react';
import { FiNavigation } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';

export default function TripCard({ trip, priceLabel, availableSeats = 0, onSelect, searchState }) {
    const navigate = useNavigate();
    const location = useLocation();
    
    if (!trip) {
        return null;
    }

    const handleSelect = () => {
        // Kiểm tra đăng nhập trước
        const loggedInUser = localStorage.getItem('user');
        if (!loggedInUser) {
            alert('Vui lòng đăng nhập để đặt vé!');
            navigate('/login');
            return;
        }

        // Nếu có callback onSelect từ parent, gọi nó
        if (typeof onSelect === 'function') {
            onSelect(trip);
        } else {
            // Xác định returnTo dựa trên location hiện tại
            const currentPath = location.pathname;
            const returnTo = currentPath === '/' ? '/' : '/schedule';
            
            // Mặc định: chuyển đến trang chi tiết trip và truyền state
            navigate(`/trip/${trip.trip_id}`, {
                state: {
                    returnTo: returnTo,
                    searchState: searchState || location.state?.searchState
                }
            });
        }
    };

    return (
        <div className="trip-item-card">
            {/* Column 1: Operator information & timing */}
            <div className="card-left">
                <div className="trip-time-box">
                    <div className="time-point">
                        <span className="hour">{trip.time_start}</span>
                        <span className="place">{trip.station_name}</span>
                    </div>
                    <div className="duration-line">
                        <span className="dot-start"></span>
                        <span className="line"></span>
                        <span className="duration-text">{trip.duration}</span>
                        <span className="dot-end"></span>
                        <FiNavigation className="nav-icon" />
                    </div>
                    <div className="time-point">
                        <span className="hour">{trip.time_end}</span>
                        <span className="place">{trip.route_name}</span>
                    </div>
                </div>
                <div className="trip-vendor-info">
                    <span className="badge-bus">{trip.vehicle_type}</span>
                    <span className="vendor-name">{trip.brand_name}</span>
                </div>
            </div>

            {/* Column 2: Price & CTA */}
            <div className="card-right">
                <div className="price-tag">
                    {priceLabel}
                </div>
                <div className="seat-status">
                    {availableSeats} seats left
                </div>
                <button className="btn-choose" onClick={handleSelect}>
                    Choose trip
                </button>
            </div>
        </div>
    );
}
