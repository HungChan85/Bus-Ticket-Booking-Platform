import React from 'react';
import { FiX, FiMapPin, FiTruck, FiClock } from 'react-icons/fi';

const RouteDetailModal = ({ route, onClose }) => {
    if (!route) return null;

    const formatDuration = (timeString) => {
        if (!timeString) return 'N/A';
        const parts = timeString.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="detail-overlay" onClick={onClose}>
            <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
                <div className="detail-modal-header">
                    <h2 className="detail-title">Route Details</h2>
                    <button onClick={onClose} className="detail-close-btn">
                        <FiX size={24} />
                    </button>
                </div>

                <div className="detail-modal-body">
                    <div className="detail-section">
                        <h3 className="detail-section-title">
                            <FiMapPin className="detail-icon" />
                            Route Information
                        </h3>
                        <div className="detail-info-grid">
                            <div className="detail-info-item">
                                <span className="detail-label">Route ID:</span>
                                <span className="detail-value">#{route.route_id}</span>
                            </div>
                            <div className="detail-info-item">
                                <span className="detail-label">Distance:</span>
                                <span className="detail-value">{route.distance} km</span>
                            </div>
                            <div className="detail-info-item">
                                <span className="detail-label">Duration:</span>
                                <span className="detail-value">{formatDuration(route.default_duration_time)}</span>
                            </div>
                            <div className="detail-info-item">
                                <span className="detail-label">Operator:</span>
                                <span className="detail-value detail-operator">{route.operator_name}</span>
                            </div>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h3 className="detail-section-title">
                            <FiMapPin className="detail-icon" />
                            Departure Station
                        </h3>
                        <div className="detail-station-card">
                            <div className="detail-station-city">{route.departure_city}</div>
                            <div className="detail-station-name">{route.departure_station}</div>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h3 className="detail-section-title">
                            <FiMapPin className="detail-icon" />
                            Arrival Station
                        </h3>
                        <div className="detail-station-card">
                            <div className="detail-station-city">{route.arrival_city}</div>
                            <div className="detail-station-name">{route.arrival_station}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TripDetailModal = ({ trip, onClose }) => {
    if (!trip) return null;

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const occupancyRate = ((trip.bus_capacity - trip.available_seats) / trip.bus_capacity * 100).toFixed(0);
    const statusKey = trip.trip_status.toLowerCase();
    const occupancyTone = occupancyRate > 80 ? 'high' : occupancyRate > 50 ? 'medium' : 'low';

    return (
        <div className="detail-overlay" onClick={onClose}>
            <div className="detail-modal detail-modal-wide" onClick={(e) => e.stopPropagation()}>
                <div className="detail-modal-header">
                    <h2 className="detail-title">Trip Details</h2>
                    <button onClick={onClose} className="detail-close-btn">
                        <FiX size={24} />
                    </button>
                </div>

                <div className="detail-modal-body">
                    <div className="detail-section">
                        <h3 className="detail-section-title">
                            <FiMapPin className="detail-icon" />
                            Trip Information
                        </h3>
                        <div className="detail-info-grid">
                            <div className="detail-info-item">
                                <span className="detail-label">Trip ID:</span>
                                <span className="detail-value">#{trip.trip_id}</span>
                            </div>
                            <div className="detail-info-item">
                                <span className="detail-label">Route:</span>
                                <span className="detail-value">{trip.route_name}</span>
                            </div>
                            <div className="detail-info-item">
                                <span className="detail-label">Status:</span>
                                <span className={`trip-status ${statusKey}`}>
                                    {trip.trip_status}
                                </span>
                            </div>
                            <div className="detail-info-item">
                                <span className="detail-label">Operator:</span>
                                <span className="detail-value detail-operator">{trip.operator_name}</span>
                            </div>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h3 className="detail-section-title">
                            <FiClock className="detail-icon" />
                            Schedule
                        </h3>
                        <div className="detail-info-grid">
                            <div className="detail-info-item">
                                <span className="detail-label">Departure:</span>
                                <span className="detail-value">{formatDateTime(trip.service_date)}</span>
                            </div>
                            <div className="detail-info-item">
                                <span className="detail-label">Arrival:</span>
                                <span className="detail-value">{formatDateTime(trip.arrival_datetime)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h3 className="detail-section-title">
                            <FiMapPin className="detail-icon" />
                            Stations
                        </h3>
                        <div className="detail-info-grid">
                            <div className="detail-station-card">
                                <div className="detail-label">From</div>
                                <div className="detail-station-city">{trip.departure_city}</div>
                                <div className="detail-station-name">{trip.departure_station}</div>
                            </div>
                            <div className="detail-station-card">
                                <div className="detail-label">To</div>
                                <div className="detail-station-city">{trip.arrival_city}</div>
                                <div className="detail-station-name">{trip.arrival_station}</div>
                            </div>
                        </div>
                    </div>

                    <div className="detail-section">
                        <h3 className="detail-section-title">
                            <FiTruck className="detail-icon" />
                            Bus Information
                        </h3>
                        <div className="detail-info-grid">
                            <div className="detail-info-item">
                                <span className="detail-label">Plate Number:</span>
                                <span className="detail-value">{trip.bus_plate}</span>
                            </div>
                            <div className="detail-info-item">
                                <span className="detail-label">Vehicle Type:</span>
                                <span className="detail-value">{trip.bus_type}</span>
                            </div>
                            <div className="detail-info-item">
                                <span className="detail-label">Capacity:</span>
                                <span className="detail-value">{trip.bus_capacity} seats</span>
                            </div>
                            <div className="detail-info-item">
                                <span className="detail-label">Available:</span>
                                <span className={`detail-value seats-available ${trip.available_seats < 5 ? 'low' : 'ok'}`}>
                                    {trip.available_seats} seats
                                </span>
                            </div>
                        </div>

                        <div className="occupancy-block">
                            <div className="occupancy-header">
                                <span className="detail-label">Occupancy Rate:</span>
                                <span className="detail-value strong">{occupancyRate}%</span>
                            </div>
                            <div className="occupancy-bar">
                                <div
                                    className={`occupancy-bar-fill ${occupancyTone}`}
                                    style={{ width: `${occupancyRate}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export { RouteDetailModal, TripDetailModal };
