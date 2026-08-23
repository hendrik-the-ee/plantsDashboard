import { Link } from 'react-router-dom';
import { SOIL_TYPES } from './PlantForm.jsx';
import StatusBadge from './StatusBadge.jsx';

const SOIL_LABELS = Object.fromEntries(SOIL_TYPES.map((option) => [option.value, option.label]));

export default function PlantCard({ plant }) {
  const gps =
    plant.latitude != null && plant.longitude != null
      ? `GPS ${plant.latitude}, ${plant.longitude}`
      : null;
  const meta = [gps, plant.species].filter(Boolean).join(' · ');
  const extras = [
    plant.planted_on && `Planted ${plant.planted_on}`,
    plant.container_size_liters && `${plant.container_size_liters} L`,
    plant.soil_type && SOIL_LABELS[plant.soil_type],
  ].filter(Boolean);

  return (
    <Link to={`/plants/${plant.id}`} className="card plant-card">
      <div className="photo-placeholder" aria-hidden="true">
        Photo
      </div>
      <div>
        <h2>
          {plant.name}
          {!plant.archived_at && plant.water_status && (
            <StatusBadge status={plant.water_status} />
          )}
          {plant.archived_at && <span className="badge">Archived</span>}
        </h2>
        {meta && <p className="muted">{meta}</p>}
        {extras.length > 0 && <p className="muted">{extras.join(' · ')}</p>}
      </div>
    </Link>
  );
}
