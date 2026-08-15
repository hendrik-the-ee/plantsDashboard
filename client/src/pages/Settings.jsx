import { useEffect, useState } from 'react';
import { api } from '../api.js';

const TIMEZONES = Intl.supportedValuesOf('timeZone');

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [timezone, setTimezone] = useState('');
  const [units, setUnits] = useState('metric');
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getSettings()
      .then((row) => {
        if (cancelled) return;
        setSettings(row);
        setTimezone(row.timezone);
        setUnits(row.units);
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
      const row = await api.updateSettings({ timezone, units });
      setSettings(row);
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  if (error && !settings) return <p className="bad">{error.message}</p>;
  if (!settings) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Settings</h1>
      <p className="muted">Timezone is used from Phase 2 onward for “due today” watering badges.</p>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Timezone
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
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
        {error && <p className="bad">{error.message}</p>}
        {saved && <p className="ok">Saved.</p>}
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </>
  );
}
