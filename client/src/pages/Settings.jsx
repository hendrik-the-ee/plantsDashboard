import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { timezoneLabel, timezoneOptions } from '../lib/timezones.js';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [timezone, setTimezone] = useState('');
  const [units, setUnits] = useState('metric');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getSettings()
      .then((row) => {
        if (cancelled) return;
        setSettings(row);
        setTimezone(row.timezone);
        setUnits(row.units);
        setLatitude(row.latitude ?? '');
        setLongitude(row.longitude ?? '');
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload = {
        timezone,
        units,
        latitude: latitude === '' ? null : Number(latitude),
        longitude: longitude === '' ? null : Number(longitude),
      };
      const row = await api.updateSettings(payload);
      setSettings(row);
      setLatitude(row.latitude ?? '');
      setLongitude(row.longitude ?? '');
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleUseLocation() {
    if (!navigator.geolocation) {
      setError(new Error('Geolocation is not available in this browser.'));
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(Number(position.coords.latitude.toFixed(5)));
        setLongitude(Number(position.coords.longitude.toFixed(5)));
        setLocating(false);
      },
      (err) => {
        setError(new Error(err.message || 'Could not read your location.'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  if (error && !settings) return <p className="bad">{error.message}</p>;
  if (!settings) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Settings</h1>
      <p className="muted">
        Timezone drives watering badges. Garden location drives the weather forecast.
      </p>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Timezone
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {timezoneOptions(timezone).map((zone) => (
              <option key={zone} value={zone}>
                {timezoneLabel(zone)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Units
          <select value={units} onChange={(e) => setUnits(e.target.value)}>
            <option value="metric">Metric</option>
            <option value="imperial">Imperial</option>
          </select>
        </label>

        <fieldset className="fieldset">
          <legend>Garden location</legend>
          <p className="muted fieldset-help">
            One coordinate pair for the whole garden. Used for the 3-day forecast and care
            advisories.
          </p>
          <div className="form-row">
            <label>
              Latitude
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 40.7128"
              />
            </label>
            <label>
              Longitude
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. -74.0060"
              />
            </label>
          </div>
          <div className="button-row">
            <button type="button" className="secondary" onClick={handleUseLocation} disabled={locating}>
              {locating ? 'Locating…' : 'Use my location'}
            </button>
          </div>
        </fieldset>

        {error && <p className="bad">{error.message}</p>}
        {saved && <p className="ok">Saved.</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </>
  );
}
