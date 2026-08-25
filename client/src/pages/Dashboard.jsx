import { useState } from 'react';
import { Link } from 'react-router-dom';
import ForecastStrip from '../components/ForecastStrip.jsx';
import PlantCard from '../components/PlantCard.jsx';
import { usePlants } from '../hooks/usePlants.js';
import { useWeather } from '../hooks/useWeather.js';

export default function Dashboard() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { plants, loading, error } = usePlants(includeArchived);
  const {
    weather,
    loading: weatherLoading,
    error: weatherError,
    locationMissing,
  } = useWeather();

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Garden Plants Dashboard</h1>
          <p className="muted">Watering status, weather, and care history for each plant.</p>
        </div>
        <Link to="/plants/new" className="button">
          Add plant
        </Link>
      </header>

      {weatherLoading && <p className="muted">Loading forecast…</p>}
      {locationMissing && (
        <p className="card forecast-missing">
          Set a garden location in <Link to="/settings">Settings</Link> to see the 3-day forecast
          and care advisories.
        </p>
      )}
      {weatherError && <p className="bad">{weatherError.message}</p>}
      {weather && <ForecastStrip weather={weather} />}

      <label className="checkbox">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
        />
        Show archived
      </label>

      {loading && <p className="muted">Loading plants…</p>}
      {error && <p className="bad">{error.message}</p>}
      {!loading && !error && plants.length === 0 && (
        <p className="muted">No plants yet. Add one to get started.</p>
      )}
      <div className="plant-grid">
        {plants.map((plant) => (
          <PlantCard key={plant.id} plant={plant} />
        ))}
      </div>
    </>
  );
}
