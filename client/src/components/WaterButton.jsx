import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function WaterButton({ plant, onWatered, editTo = '#log-event' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const usual = plant.usual_water_ml;
  const suggested = plant.suggested_water_ml;
  const rainCovered = Boolean(plant.water_rain_covered);
  const adjusted = Boolean(plant.water_rain_adjusted);

  async function handleWater() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.waterPlant(plant.id);
      if (result?.skipped) {
        setNotice('Skipped — yesterday’s rain covered the usual watering amount.');
        onWatered?.();
        return;
      }
      onWatered?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  let label = `Water ${suggested ?? usual ?? 500} ml`;
  if (rainCovered) {
    label = 'Rain covered — skip';
  } else if (adjusted && usual != null && suggested != null) {
    label = `Water ${suggested} ml`;
  }

  return (
    <div className="water-button-wrap">
      {adjusted && !rainCovered && usual != null && plant.rain_credit_ml != null && (
        <span className="water-rain-note">
          💧 {plant.rain_credit_ml} ml rain credit
        </span>
      )}
      {rainCovered && (
        <span className="water-rain-note">
          💧 Yesterday’s rain (~{plant.rain_credit_ml} ml credit) covers the usual {usual} ml.
        </span>
      )}
      <button type="button" onClick={handleWater} disabled={busy || plant.archived_at}>
        {busy ? 'Logging…' : label}
      </button>
      {editTo.startsWith('#') ? (
        <a href={editTo} className="water-edit-link">
          edit amount or date
        </a>
      ) : (
        <Link to={editTo} className="water-edit-link">
          edit amount or date
        </Link>
      )}
      {notice && <span className="ok">{notice}</span>}
      {error && <span className="bad">{error}</span>}
    </div>
  );
}
