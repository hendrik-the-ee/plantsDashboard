import { useState } from 'react';
import { api } from '../api.js';

function defaultAmountMl(plant) {
  if (plant.last_amount_ml != null) return Number(plant.last_amount_ml);
  if (plant.container_size_liters != null) {
    return Math.max(250, Math.round(Number(plant.container_size_liters) * 100));
  }
  return 500;
}

export default function WaterButton({ plant, onWatered }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const amount = defaultAmountMl(plant);

  async function handleWater() {
    setBusy(true);
    setError(null);
    try {
      await api.waterPlant(plant.id);
      onWatered?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="water-button-wrap">
      <button type="button" onClick={handleWater} disabled={busy || plant.archived_at}>
        {busy ? 'Logging…' : `Water ${amount} ml`}
      </button>
      <a href="#log-event" className="muted water-edit-link">
        edit amount or date
      </a>
      {error && <p className="bad">{error}</p>}
    </div>
  );
}
