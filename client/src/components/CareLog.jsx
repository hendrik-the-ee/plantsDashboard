import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { SOIL_TYPES } from './PlantForm.jsx';
import {
  EVENT_TYPES,
  YIELD_UNITS,
  daysAgoLocalInput,
  formatEventTime,
  localInputToIso,
  summarizeEvent,
  toLocalInputValue,
} from '../lib/careEvents.js';

function emptyForm(type = 'water') {
  return {
    type,
    occurred_at: '',
    amount_ml: '',
    yield_amount: '',
    yield_unit: 'g',
    container_size_liters: '',
    soil_type: '',
    notes: '',
  };
}

export default function CareLog({ plantId, readOnly = false, refreshKey, onChange }) {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await api.listEvents(plantId, filter || undefined));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [plantId, filter, refreshKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function buildPayload() {
    const payload = { type: form.type };
    const occurredAt = localInputToIso(form.occurred_at);
    if (occurredAt) payload.occurred_at = occurredAt;
    if (form.notes.trim()) payload.notes = form.notes.trim();

    if (form.type === 'water') {
      payload.amount_ml = Number(form.amount_ml);
    } else if (form.type === 'harvest') {
      payload.yield_amount = Number(form.yield_amount);
      payload.yield_unit = form.yield_unit;
    } else if (form.type === 'repot') {
      if (form.container_size_liters !== '') {
        payload.container_size_liters = Number(form.container_size_liters);
      }
      if (form.soil_type) payload.soil_type = form.soil_type;
    }
    return payload;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createEvent(plantId, buildPayload());
      setForm(emptyForm(form.type));
      setShowForm(false);
      await reload();
      onChange?.();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(eventId) {
    if (!window.confirm('Delete this care entry?')) return;
    setError(null);
    try {
      await api.deleteEvent(eventId);
      await reload();
      onChange?.();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <section className="card care-log" id="log-event">
      <header className="care-log-header">
        <h2>Care log</h2>
        {!readOnly && (
          <button type="button" className="button secondary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'Log care'}
          </button>
        )}
      </header>

      <label>
        Filter
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All types</option>
          {EVENT_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {showForm && !readOnly && (
        <form className="form care-form" onSubmit={handleSubmit}>
          <label>
            Type
            <select value={form.type} onChange={(e) => setField('type', e.target.value)}>
              {EVENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            When
            <input
              type="datetime-local"
              value={form.occurred_at}
              onChange={(e) => setField('occurred_at', e.target.value)}
            />
          </label>
          <div className="button-row">
            <button type="button" className="button secondary" onClick={() => setField('occurred_at', daysAgoLocalInput(1))}>
              Yesterday
            </button>
            <button type="button" className="button secondary" onClick={() => setField('occurred_at', daysAgoLocalInput(2))}>
              2 days ago
            </button>
            <button type="button" className="button secondary" onClick={() => setField('occurred_at', toLocalInputValue())}>
              Now
            </button>
          </div>

          {form.type === 'water' && (
            <label>
              Amount (ml)
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                value={form.amount_ml}
                onChange={(e) => setField('amount_ml', e.target.value)}
              />
            </label>
          )}

          {form.type === 'harvest' && (
            <div className="form-row">
              <label>
                Yield
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.yield_amount}
                  onChange={(e) => setField('yield_amount', e.target.value)}
                />
              </label>
              <label>
                Unit
                <select value={form.yield_unit} onChange={(e) => setField('yield_unit', e.target.value)}>
                  {YIELD_UNITS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {form.type === 'repot' && (
            <div className="form-row">
              <label>
                New container (L)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.container_size_liters}
                  onChange={(e) => setField('container_size_liters', e.target.value)}
                />
              </label>
              <label>
                New soil
                <select value={form.soil_type} onChange={(e) => setField('soil_type', e.target.value)}>
                  <option value="">—</option>
                  {SOIL_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <label>
            Notes
            <textarea rows="2" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
          </label>

          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </form>
      )}

      {loading && <p className="muted">Loading timeline…</p>}
      {error && <p className="bad">{error.message}</p>}

      {!loading && events.length === 0 && <p className="muted">No care events yet.</p>}

      <ol className="timeline">
        {events.map((event) => (
          <li key={event.id}>
            <div className="timeline-main">
              <strong>{EVENT_TYPES.find((t) => t.value === event.type)?.label ?? event.type}</strong>
              <span className="muted">{formatEventTime(event.occurred_at)}</span>
            </div>
            <p>{summarizeEvent(event)}</p>
            {event.notes && event.type !== 'observation' && (
              <p className="muted">{event.notes}</p>
            )}
            {!readOnly && (
              <button type="button" className="link-button" onClick={() => handleDelete(event.id)}>
                Delete
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
