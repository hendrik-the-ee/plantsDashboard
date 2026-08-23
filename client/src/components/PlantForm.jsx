import { useState } from 'react';

export const SOIL_TYPES = [
  { value: 'potting_mix', label: 'Potting mix' },
  { value: 'loam', label: 'Loam' },
  { value: 'sandy', label: 'Sandy' },
  { value: 'clay', label: 'Clay' },
  { value: 'coco_coir', label: 'Coco coir' },
  { value: 'raised_bed', label: 'Raised bed' },
  { value: 'hydroponic', label: 'Hydroponic' },
  { value: 'other', label: 'Other' },
];

export const LIGHT_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'bright', label: 'Bright' },
  { value: 'full_sun', label: 'Full sun' },
];

function emptyForm() {
  return {
    name: '',
    species: '',
    latitude: '',
    longitude: '',
    acquired_on: '',
    planted_on: '',
    is_edible: false,
    days_to_maturity: '',
    watering_interval_days: '7',
    fertilize_interval_days: '',
    container_size_liters: '',
    soil_type: '',
    light_level: '',
    notes: '',
  };
}

function fromPlant(plant) {
  const form = emptyForm();
  for (const key of Object.keys(form)) {
    const value = plant[key];
    if (key === 'is_edible') form[key] = Boolean(value);
    else form[key] = value == null ? '' : String(value);
  }
  return form;
}

function toPayload(form) {
  const payload = {
    name: form.name.trim(),
    species: form.species.trim() || null,
    latitude: form.latitude === '' ? null : Number(form.latitude),
    longitude: form.longitude === '' ? null : Number(form.longitude),
    acquired_on: form.acquired_on || null,
    planted_on: form.planted_on || null,
    is_edible: Boolean(form.is_edible),
    days_to_maturity: form.days_to_maturity === '' ? null : Number(form.days_to_maturity),
    watering_interval_days: Number(form.watering_interval_days),
    fertilize_interval_days:
      form.fertilize_interval_days === '' ? null : Number(form.fertilize_interval_days),
    container_size_liters:
      form.container_size_liters === '' ? null : Number(form.container_size_liters),
    soil_type: form.soil_type || null,
    light_level: form.light_level || null,
    notes: form.notes.trim() || null,
  };
  return payload;
}

export default function PlantForm({ plant, onSubmit, submitLabel, error }) {
  const [form, setForm] = useState(() => (plant ? fromPlant(plant) : emptyForm()));
  const [saving, setSaving] = useState(false);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(toPayload(form));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        Name
        <input
          required
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
        />
      </label>
      <label>
        Species
        <input value={form.species} onChange={(e) => setField('species', e.target.value)} />
      </label>
      <div className="form-row">
        <label>
          Latitude
          <input
            type="number"
            min="-90"
            max="90"
            step="0.00001"
            value={form.latitude}
            onChange={(e) => setField('latitude', e.target.value)}
          />
        </label>
        <label>
          Longitude
          <input
            type="number"
            min="-180"
            max="180"
            step="0.00001"
            value={form.longitude}
            onChange={(e) => setField('longitude', e.target.value)}
          />
        </label>
      </div>
      <p className="muted">GPS coordinates. Leave both blank if the plant is not placed yet.</p>
      <div className="form-row">
        <label>
          Acquired on
          <input
            type="date"
            value={form.acquired_on}
            onChange={(e) => setField('acquired_on', e.target.value)}
          />
        </label>
        <label>
          Planted on
          <input
            type="date"
            value={form.planted_on}
            onChange={(e) => setField('planted_on', e.target.value)}
          />
        </label>
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={form.is_edible}
          onChange={(e) => setField('is_edible', e.target.checked)}
        />
        Edible
      </label>
      <div className="form-row">
        <label>
          Watering interval (days)
          <input
            type="number"
            min="1"
            required
            value={form.watering_interval_days}
            onChange={(e) => setField('watering_interval_days', e.target.value)}
          />
        </label>
        <label>
          Fertilize interval (days)
          <input
            type="number"
            min="1"
            value={form.fertilize_interval_days}
            onChange={(e) => setField('fertilize_interval_days', e.target.value)}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Container size (liters)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.container_size_liters}
            onChange={(e) => setField('container_size_liters', e.target.value)}
          />
        </label>
        <label>
          Days to maturity
          <input
            type="number"
            min="1"
            value={form.days_to_maturity}
            onChange={(e) => setField('days_to_maturity', e.target.value)}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Soil type
          <select value={form.soil_type} onChange={(e) => setField('soil_type', e.target.value)}>
            <option value="">—</option>
            {SOIL_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Light level
          <select value={form.light_level} onChange={(e) => setField('light_level', e.target.value)}>
            <option value="">—</option>
            {LIGHT_LEVELS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Notes
        <textarea rows="3" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
      </label>
      {error && <p className="bad">{error}</p>}
      <button type="submit" disabled={saving}>
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
