import { useState } from 'react';
import { Link } from 'react-router-dom';
import PlantCard from '../components/PlantCard.jsx';
import { usePlants } from '../hooks/usePlants.js';

export default function Dashboard() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { plants, loading, error } = usePlants(includeArchived);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Garden Plants Dashboard</h1>
          <p className="muted">Watering status and care history for each plant.</p>
        </div>
        <Link to="/plants/new" className="button">
          Add plant
        </Link>
      </header>

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
