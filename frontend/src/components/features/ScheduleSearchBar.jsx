import React, { useEffect } from 'react';
import { FiMapPin, FiCalendar, FiSearch } from 'react-icons/fi';

export default function ScheduleSearchBar({
    stations = [],
    searchParams,
    onParamsChange,
    onSubmit,
    loading,
    stationsLoading = false,
}) {
    const hasStations = stations.length > 0;

    // Auto-pick the first station if none is selected once stations are loaded
    useEffect(() => {
        if (!stationsLoading && hasStations && !searchParams.station_id && typeof onParamsChange === 'function') {
            onParamsChange('station_id', stations[0].station_id);
        }
    }, [stationsLoading, hasStations, searchParams.station_id, onParamsChange, stations]);

    const handleChange = (field) => (event) => {
        if (typeof onParamsChange === 'function') {
            onParamsChange(field, event.target.value);
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (typeof onSubmit === 'function') {
            onSubmit(event);
        }
    };

    return (
        <form className="schedule-search-widget" onSubmit={handleSubmit}>
            <div className="schedule-search-field">
                <FiMapPin className="schedule-search-icon" />
                <div className="schedule-search-group">
                    <label>Departure station</label>
                    <select
                        value={searchParams.station_id}
                        onChange={handleChange('station_id')}
                        disabled={stationsLoading || !hasStations}
                    >
                        {stationsLoading && <option>Loading stations...</option>}
                        {!stationsLoading && !hasStations && <option>No stations available</option>}
                        {stations.map((station) => (
                            <option key={station.station_id} value={station.station_id}>
                                {station.city} - {station.station_name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="schedule-search-field">
                <FiCalendar className="schedule-search-icon" />
                <div className="schedule-search-group">
                    <label>Travel date</label>
                    <input
                        type="date"
                        value={searchParams.date}
                        onChange={handleChange('date')}
                    />
                </div>
            </div>

            <button
                type="submit"
                className="schedule-search-btn"
                disabled={!searchParams.station_id || loading}
            >
                <FiSearch />
                <span>{loading ? 'Searching...' : 'Search trips'}</span>
            </button>
        </form>
    );
}
