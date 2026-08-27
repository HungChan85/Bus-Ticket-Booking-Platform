import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../../App.css';
import { FiMapPin, FiCalendar, FiRepeat } from 'react-icons/fi';
import TripCard from './TripCard';
import { apiUrl } from '../../utils/api';

const API_BASE_URL = apiUrl('/api/schedule');

const SearchForm = () => {
  const location = useLocation();
  
  // Restore state from navigation if available
  const restoredState = location.state?.searchState;
  
  const [stations, setStations] = useState([]);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [formValues, setFormValues] = useState(restoredState?.formValues || {
    departure: '',
    destination: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [trips, setTrips] = useState(restoredState?.trips || []);
  const [hasSearched, setHasSearched] = useState(restoredState?.hasSearched || false);

  useEffect(() => {
    let isMounted = true;
    const fetchStations = async () => {
      setStationsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/stations`);
        if (!response.ok) {
          throw new Error('Failed to load stations');
        }
        const payload = await response.json();
        const list = payload.data ?? [];
        if (!isMounted) {
          return;
        }
        setErrorMessage('');
        setStations(list);
        
        // If we have restored state, don't override formValues
        if (restoredState) {
          return;
        }
        
        if (list.length > 0) {
          setFormValues((prev) => ({
            ...prev,
            departure: prev.departure || list[0].station_id,
            destination:
              prev.destination ||
              (list.length > 1 ? list[1].station_id : list[0].station_id),
          }));
        }
      } catch (error) {
        console.error('Unable to load stations', error);
        if (isMounted) {
          setErrorMessage('Unable to load stations. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setStationsLoading(false);
        }
      }
    };

    fetchStations();
    return () => {
      isMounted = false;
    };
  }, [restoredState]);

  const handleFieldChange = (field) => (event) => {
    const value = event.target.value;
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSwap = () => {
    setFormValues((prev) => ({
      ...prev,
      departure: prev.destination,
      destination: prev.departure,
    }));
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
      Number(val || 0)
    );

  const handleSearch = async (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (!formValues.departure || !formValues.date) {
      return;
    }

    setHasSearched(true);
    setLoading(true);
    setErrorMessage('');
    try {
      const params = new URLSearchParams({
        station_id: formValues.departure,
        date: formValues.date,
      });
      if (formValues.destination && formValues.destination !== formValues.departure) {
        params.append('destination_id', formValues.destination);
      }

      const response = await fetch(`${API_BASE_URL}/trips?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to search trips');
      }
      setTrips(payload.data ?? []);
    } catch (error) {
      console.error('Unable to search trips', error);
      setErrorMessage('Unable to search trips. Please try again.');
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const renderStationOptions = () => {
    if (stationsLoading) {
      return <option>Loading stations...</option>;
    }

    if (!stations.length) {
      return <option>No stations available</option>;
    }

    return stations.map((station) => (
      <option key={station.station_id} value={station.station_id}>
        {station.city} - {station.station_name}
      </option>
    ));
  };

  // Auto-load trips once stations & defaults are ready (one-shot)
  useEffect(() => {
    if (!stationsLoading && stations.length > 0 && !hasSearched && formValues.departure && formValues.date) {
      handleSearch();
    }
  }, [stationsLoading, stations.length, hasSearched, formValues.departure, formValues.date]);

  return (
    <div className="search-widget">
      <form className="search-form" onSubmit={handleSearch}>
        <div className="input-wrapper">
          <FiMapPin className="input-icon" />
          <div className="input-group">
            <label>From</label>
            <select
              className="input-field"
              value={formValues.departure}
              onChange={handleFieldChange('departure')}
              disabled={stationsLoading || !stations.length}
            >
              {renderStationOptions()}
            </select>
          </div>
        </div>

        <button
          type="button"
          className="swap-btn"
          onClick={handleSwap}
          aria-label="Swap departure and destination"
          disabled={!formValues.departure || !formValues.destination}
        >
          <FiRepeat />
        </button>

        <div className="input-wrapper">
          <FiMapPin className="input-icon" />
          <div className="input-group">
            <label>To</label>
            <select
              className="input-field"
              value={formValues.destination}
              onChange={handleFieldChange('destination')}
              disabled={stationsLoading || !stations.length}
            >
              {renderStationOptions()}
            </select>
          </div>
        </div>

        <div className="input-wrapper">
          <FiCalendar className="input-icon" />
          <div className="input-group">
            <label>Departure Date</label>
            <input
              type="date"
              className="input-field"
              value={formValues.date}
              onChange={handleFieldChange('date')}
            />
          </div>
        </div>

        <button type="submit" className="search-btn" disabled={!formValues.departure || loading}>
          {loading ? 'Searching...' : 'Search Trips'}
        </button>
      </form>

      <div className="search-results">
        {errorMessage && <p className="error-text">{errorMessage}</p>}
        {!errorMessage && !loading && hasSearched && !trips.length && (
          <p>No trips found for your selection. Please adjust filters.</p>
        )}
        {!errorMessage && !hasSearched && <p>Select a route and click search to view trips.</p>}
        {loading && <p>Searching trips...</p>}

        {!loading && !errorMessage && trips.length > 0 && (
          <div className="trip-list-grid">
            {trips.map((trip) => (
              <TripCard
                key={trip.trip_id}
                trip={trip}
                availableSeats={trip.available_seats ?? 0}
                priceLabel={formatCurrency(trip.price)}
                searchState={{
                  formValues,
                  trips,
                  hasSearched
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchForm;