import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import CareLog from '../components/CareLog.jsx';
import PhotoUploader from '../components/PhotoUploader.jsx';
import { LIGHT_LEVELS, SOIL_TYPES, STARTED_AS } from '../components/PlantForm.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import WaterButton from '../components/WaterButton.jsx';
import { plantPhotoUrl } from '../lib/photos.js';

const soilLabel = Object.fromEntries(SOIL_TYPES.map((o) => [o.value, o.label]));
const lightLabel = Object.fromEntries(LIGHT_LEVELS.map((o) => [o.value, o.label]));
const startedAsLabel = Object.fromEntries(STARTED_AS.map((o) => [o.value, o.label]));

function SpecItem({ label, value, wide = false }) {
  if (value == null || value === '') return null;
  return (
    <div className={wide ? 'spec-item spec-wide' : 'spec-item'}>
      <span className="spec-label">{label}</span>
      <span className="spec-value">{value}</span>
    </div>
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
    reloadPlant().catch((err) => {
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

  const thumbUrl = plantPhotoUrl(plant.latest_photo_path);

  return (
    <>
      <p className="back-link">
        <Link to="/">← Dashboard</Link>
      </p>

      <section className="card plant-overview">
        <div className="plant-overview-top">
          <div className="plant-overview-heading">
            <h1>
              {plant.name}
              {!plant.archived_at && plant.water_status && (
                <StatusBadge status={plant.water_status} />
              )}
              {plant.archived_at && <span className="badge">Archived</span>}
            </h1>
            {plant.species && <p className="muted plant-subtitle">{plant.species}</p>}
            {plant.next_water_due && !plant.archived_at && (
              <p className="muted plant-subtitle">Next water due: {plant.next_water_due}</p>
            )}
          </div>
          <div className="photo-placeholder photo-square" aria-hidden={!thumbUrl}>
            {thumbUrl ? <img src={thumbUrl} alt="" /> : 'Photo'}
          </div>
        </div>

        <div className="plant-overview-actions">
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
          {!plant.archived_at && <WaterButton plant={plant} onWatered={reloadPlant} />}
        </div>

        {error && <p className="bad">{error.message}</p>}

        <div className="spec-grid">
          <SpecItem label="Planted" value={plant.planted_on} />
          <SpecItem label="Acquired" value={plant.acquired_on} />
          <SpecItem label="Container" value={plant.container_size_liters && `${plant.container_size_liters} L`} />
          <SpecItem label="Plants" value={plant.plant_count != null ? plant.plant_count : null} />
          <SpecItem label="Top area" value={plant.top_area_cm2 && `${plant.top_area_cm2} cm²`} />
          <SpecItem label="Soil" value={soilLabel[plant.soil_type]} />
          <SpecItem label="Started as" value={startedAsLabel[plant.started_as]} />
          <SpecItem label="Light" value={lightLabel[plant.light_level]} />
          <SpecItem label="Water every" value={`${plant.watering_interval_days} days`} />
          <SpecItem
            label="Fertilize every"
            value={plant.fertilize_interval_days && `${plant.fertilize_interval_days} days`}
          />
          <SpecItem label="Days to maturity" value={plant.days_to_maturity} />
          <SpecItem label="Edible" value={plant.is_edible ? 'Yes' : 'No'} />
          <SpecItem label="Notes" value={plant.notes} wide />
        </div>
      </section>

      {!plant.archived_at && <PhotoUploader plantId={plant.id} onChange={reloadPlant} />}

      <CareLog
        plantId={plant.id}
        readOnly={Boolean(plant.archived_at)}
        refreshKey={plant.last_watered_at}
        onChange={reloadPlant}
        suggestedWaterMl={plant.suggested_water_ml}
        usualWaterMl={plant.usual_water_ml}
        waterRainAdjusted={plant.water_rain_adjusted}
      />
    </>
  );
}
