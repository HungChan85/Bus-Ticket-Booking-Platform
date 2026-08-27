import React, { useState, useEffect } from 'react';
import { FiEdit2, FiTrash2, FiEye, FiPlus, FiCalendar, FiClock } from 'react-icons/fi';
import { apiUrl } from '../../utils/api';

const TripTable = ({ onAdd, onEdit, onDelete, onViewDetail, refreshToken = 0 }) => {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        fetchTrips();
    }, [refreshToken]);

    const fetchTrips = async () => {
        try {
            setLoading(true);
            const response = await fetch(apiUrl('/api/trips'));
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch trips');
            }
            
            setTrips(data.data || []);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            'Scheduled': { bg: '#e3f2fd', text: '#1976d2' },
            'Departed': { bg: '#fff3e0', text: '#f57c00' },
            'Arrived': { bg: '#e8f5e9', text: '#388e3c' },
            'Cancelled': { bg: '#ffebee', text: '#d32f2f' }
        };
        return colors[status] || { bg: '#f5f5f5', text: '#666' };
    };

    const filteredTrips = trips.filter(trip => {
        const matchesSearch = 
            trip.route_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trip.bus_plate.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = filterStatus === 'all' || trip.trip_status === filterStatus;
        
        let matchesDate = true;
        if (filterDate) {
            const tripDate = trip.service_date.split(' ')[0];
            matchesDate = tripDate === filterDate;
        }
        
        return matchesSearch && matchesStatus && matchesDate;
    });

    if (loading) {
        return (
            <div className="table-loading">
                <p>Loading trips...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="table-error">
                <p>Error loading trips: {error}</p>
                <button onClick={fetchTrips} className="login-button">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="trip-table-container">
            <div className="table-toolbar">
                <h2 className="table-title">Trip Management</h2>
                
                <div className="table-filters">
                    <input
                        type="text"
                        placeholder="Search by route or bus plate..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="table-input"
                    />
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="table-input table-date"
                    />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="table-select"
                    >
                        <option value="all">All Status</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Departed">Departed</option>
                        <option value="Arrived">Arrived</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </div>

                <button 
                    onClick={() => onAdd && onAdd()}
                    className="login-button table-add-btn"
                >
                    <FiPlus /> Add Trip
                </button>
            </div>

            <div className="table-card">
                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="table-header">Trip ID</th>
                                <th className="table-header">Route</th>
                                <th className="table-header">Departure</th>
                                <th className="table-header">Arrival</th>
                                <th className="table-header">Bus</th>
                                <th className="table-header">Seats</th>
                                <th className="table-header">Status</th>
                                <th className="table-header">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTrips.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="table-empty">No trips found</td>
                                </tr>
                            ) : (
                                filteredTrips.map(trip => {
                                    const occupancyRate = ((trip.bus_capacity - trip.available_seats) / trip.bus_capacity * 100).toFixed(0);
                                    const statusKey = trip.trip_status.toLowerCase();
                                    const seatClass = trip.available_seats < 5 ? 'low' : 'ok';

                                    return (
                                        <tr key={trip.trip_id} className="table-row">
                                            <td className="table-cell">
                                                <strong>#{trip.trip_id}</strong>
                                            </td>
                                            <td className="table-cell">
                                                <div className="cell-stack">
                                                    <div className="cell-strong">{trip.route_name}</div>
                                                    <div className="cell-sub">{trip.operator_name}</div>
                                                </div>
                                            </td>
                                            <td className="table-cell">
                                                <div className="cell-inline">
                                                    <FiCalendar className="table-icon" />
                                                    <span>{formatDateTime(trip.service_date)}</span>
                                                </div>
                                            </td>
                                            <td className="table-cell">
                                                <div className="cell-inline">
                                                    <FiClock className="table-icon" />
                                                    <span>{formatDateTime(trip.arrival_datetime)}</span>
                                                </div>
                                            </td>
                                            <td className="table-cell">
                                                <div className="cell-stack">
                                                    <div className="cell-strong">{trip.bus_plate}</div>
                                                    <div className="cell-sub">
                                                        {trip.bus_type} • {trip.bus_capacity} seats
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="table-cell">
                                                <div className="cell-stack">
                                                    <div className={`seats-available ${seatClass}`}>
                                                        {trip.available_seats} available
                                                    </div>
                                                    <div className="cell-sub">{occupancyRate}% occupied</div>
                                                </div>
                                            </td>
                                            <td className="table-cell">
                                                <span className={`trip-status ${statusKey}`}>
                                                    {trip.trip_status}
                                                </span>
                                            </td>
                                            <td className="table-cell">
                                                <div className="table-actions">
                                                    <button
                                                        onClick={() => onViewDetail && onViewDetail(trip)}
                                                        className="icon-button action-view"
                                                        title="View Details"
                                                    >
                                                        <FiEye />
                                                    </button>
                                                    <button
                                                        onClick={() => onEdit && onEdit(trip)}
                                                        className="icon-button action-edit"
                                                        title="Edit"
                                                    >
                                                        <FiEdit2 />
                                                    </button>
                                                    <button
                                                        onClick={() => onDelete && onDelete(trip)}
                                                        className="icon-button action-delete"
                                                        title="Delete"
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="table-meta">
                Showing {filteredTrips.length} of {trips.length} trips
            </div>
        </div>
    );
};

export default TripTable;
