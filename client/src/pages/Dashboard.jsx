import { useState } from 'react';
import { Link } from 'react-router-dom';
import ForecastStrip from '../components/ForecastStrip.jsx';
import PlantCard from '../components/PlantCard.jsx';
import RecommendationList from '../components/RecommendationList.jsx';
import { usePlants } from '../hooks/usePlants.js';
import { useRecommendations } from '../hooks/useRecommendations.js';
import { useWeather } from '../hooks/useWeather.js';

export default function Dashboard() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { plants, loading, error, reload: reloadPlants } = usePlants(includeArchived);
  const {
    weather,
    loading: weatherLoading,
    error: weatherError,
    locationMissing,
  } = useWeather();
  const {
    items: recommendations,
    loading: recsLoading,
    error: recsError,
    dismiss,
    reload: reloadRecommendations,
  } = useRecommendations();

  const plantsById = Object.fromEntries(plants.map((plant) => [plant.id, plant]));

  async function handleWatered() {
    await Promise.all([reloadPlants(), reloadRecommendations()]);
  }

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

      <section className="card">
        <h2>What needs doing</h2>
        <RecommendationList
          items={recommendations}
          loading={recsLoading}
          error={recsError}
          onDismiss={dismiss}
          plantsById={plantsById}
          onWatered={handleWatered}
        />
      </section>

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
          onChange={(event) => setIncludeArchived(event.target.checked)}
        />
        Show archived
      </label>

      {loading && <p className="muted">Loading plants…</p>}
      {error && <p className="bad">{error.message}</p>}
      {!loading && !error && plants.length === 0 && (
        <div className="card empty-state">
          <h2>No plants yet</h2>
          <p className="muted">
            Add your first plant to start tracking watering, weather, and care.
          </p>
          <Link to="/plants/new" className="button">
            Add plant
          </Link>
        </div>
      )}
      <div className="plant-grid">
        {plants.map((plant) => (
          <PlantCard key={plant.id} plant={plant} />
        ))}
      </div>
    </>
  );
}
