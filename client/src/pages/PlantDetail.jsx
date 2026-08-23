import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import CareLog from '../components/CareLog.jsx';
import { LIGHT_LEVELS, SOIL_TYPES } from '../components/PlantForm.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import WaterButton from '../components/WaterButton.jsx';

const soilLabel = Object.fromEntries(SOIL_TYPES.map((o) => [o.value, o.label]));
const lightLabel = Object.fromEntries(LIGHT_LEVELS.map((o) => [o.value, o.label]));

function Field({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <p>
      <span className="muted">{label}</span>
      <br />
      {value}
    </p>
  );
}

export default function PlantDetail() {
  const { id } = useParams();
  const [plant, setPlant] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const reloadPlant = useCallback(async () => {
    const row = await api.getPlant(id);
    setPlant(row);
    return row;
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    reloadPlant()
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadPlant]);

  async function archive() {
    if (!window.confirm(`Archive ${plant.name}? History is kept.`)) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.archivePlant(plant.id);
      setPlant(updated);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (error && !plant) return <p className="bad">{error.message}</p>;
  if (!plant) return <p className="muted">Loading…</p>;

  return (
    <>
      <p>
        <Link to="/">← Dashboard</Link>
      </p>
      <header className="page-header">
        <div>
          <h1>
            {plant.name}
            {!plant.archived_at && plant.water_status && (
              <StatusBadge status={plant.water_status} />
            )}
            {plant.archived_at && <span className="badge">Archived</span>}
          </h1>
          {plant.species && <p className="muted">{plant.species}</p>}
          {plant.next_water_due && !plant.archived_at && (
            <p className="muted">Next water due: {plant.next_water_due}</p>
          )}
        </div>
        <div className="button-row">
          <Link to={`/plants/${plant.id}/edit`} className="button">
            Edit
          </Link>
          {!plant.archived_at && (
            <button type="button" className="button danger" onClick={archive} disabled={busy}>
              Archive
            </button>
          )}
        </div>
      </header>

      {error && <p className="bad">{error.message}</p>}

      {!plant.archived_at && (
        <section className="card">
          <WaterButton plant={plant} onWatered={reloadPlant} />
        </section>
      )}

      <section className="card">
        <div className="photo-placeholder large" aria-hidden="true">
          Photo
        </div>
        <Field label="Latitude" value={plant.latitude} />
        <Field label="Longitude" value={plant.longitude} />
        <Field label="Acquired" value={plant.acquired_on} />
        <Field label="Planted" value={plant.planted_on} />
        <Field label="Edible" value={plant.is_edible ? 'Yes' : 'No'} />
        <Field label="Days to maturity" value={plant.days_to_maturity} />
        <Field label="Watering interval" value={`${plant.watering_interval_days} days`} />
        <Field
          label="Fertilize interval"
          value={plant.fertilize_interval_days && `${plant.fertilize_interval_days} days`}
        />
        <Field
          label="Container"
          value={plant.container_size_liters && `${plant.container_size_liters} L`}
        />
        <Field label="Soil" value={soilLabel[plant.soil_type]} />
        <Field label="Light" value={lightLabel[plant.light_level]} />
        <Field label="Notes" value={plant.notes} />
      </section>

      <CareLog
        plantId={plant.id}
        readOnly={Boolean(plant.archived_at)}
        refreshKey={plant.last_watered_at}
        onChange={reloadPlant}
      />
    </>
  );
}
