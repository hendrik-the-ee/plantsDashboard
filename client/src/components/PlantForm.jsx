import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

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

export const STARTED_AS = [
  { value: 'seed', label: 'Seed' },
  { value: 'seedling', label: 'Seedling' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'root_spud', label: 'Root / spud' },
];

function emptyForm() {
  return {
    name: '',
    species: '',
    acquired_on: '',
    planted_on: '',
    is_edible: false,
    days_to_maturity: '',
    watering_interval_days: '7',
    fertilize_interval_days: '',
    container_size_liters: '',
    top_area_cm2: '',
    plant_count: '1',
    soil_type: '',
    light_level: '',
    started_as: '',
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
    acquired_on: form.acquired_on || null,
    planted_on: form.planted_on || null,
    is_edible: Boolean(form.is_edible),
    days_to_maturity: form.days_to_maturity === '' ? null : Number(form.days_to_maturity),
    watering_interval_days: Number(form.watering_interval_days),
    fertilize_interval_days:
      form.fertilize_interval_days === '' ? null : Number(form.fertilize_interval_days),
    container_size_liters:
      form.container_size_liters === '' ? null : Number(form.container_size_liters),
    top_area_cm2: form.top_area_cm2 === '' ? null : Number(form.top_area_cm2),
    plant_count: form.plant_count === '' ? 1 : Number(form.plant_count),
    soil_type: form.soil_type || null,
    light_level: form.light_level || null,
    started_as: form.started_as || null,
    notes: form.notes.trim() || null,
  };
  return payload;
}

export default function PlantForm({ plant, onSubmit, submitLabel, error }) {
  const [form, setForm] = useState(() => (plant ? fromPlant(plant) : emptyForm()));
  const [saving, setSaving] = useState(false);
  const [speciesHint, setSpeciesHint] = useState(null);
  const [speciesLookupError, setSpeciesLookupError] = useState(null);
  const [speciesLooking, setSpeciesLooking] = useState(false);
  const [speciesManual, setSpeciesManual] = useState(Boolean(plant?.species));
  const speciesLookupId = useRef(0);

  useEffect(() => {
    const name = form.name.trim();
    if (name.length < 2 || speciesManual) {
      setSpeciesHint(null);
      setSpeciesLookupError(null);
      setSpeciesLooking(false);
      return undefined;
    }

    const lookupId = ++speciesLookupId.current;
    setSpeciesLooking(true);
    setSpeciesHint(null);
    setSpeciesLookupError(null);

    const timer = setTimeout(async () => {
      try {
        const result = await api.lookupSpecies(name);
        if (speciesLookupId.current !== lookupId) return;
        setSpeciesHint(result);
        setSpeciesLookupError(null);
        if (result.species) {
          setForm((current) => {
            if (current.species.trim()) return current;
            return { ...current, species: result.species };
          });
        }
      } catch (err) {
        if (speciesLookupId.current !== lookupId) return;
        setSpeciesHint(null);
        setSpeciesLookupError(err.message);
      } finally {
        if (speciesLookupId.current === lookupId) setSpeciesLooking(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [form.name, speciesManual]);

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

  function speciesStatusMessage() {
    if (form.species.trim()) return null;
    if (speciesManual) {
      return 'Enter a scientific name, or clear this field and change the plant name to look up again.';
    }
    const name = form.name.trim();
    if (name.length < 2) {
      return 'Type a plant name (2+ characters) to look up a scientific name via Wikidata.';
    }
    if (speciesLooking) return 'Looking up scientific name in Wikidata…';
    if (speciesLookupError) {
      return 'Wikidata lookup failed — enter the scientific name manually.';
    }
    if (speciesHint && !speciesHint.species) {
      return `No plant taxon found in Wikidata for “${name}”. Enter the scientific name manually.`;
    }
    return null;
  }

  const speciesStatus = speciesStatusMessage();

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
        Species (scientific name)
        <input
          value={form.species}
          onChange={(e) => {
            setSpeciesManual(true);
            setField('species', e.target.value);
          }}
        />
      </label>
      {speciesHint?.species && (
        <p className="muted species-hint">
          Matched via{' '}
          <a href={speciesHint.sourceUrl} target="_blank" rel="noreferrer">
            {speciesHint.sourceLabel}
          </a>
          {speciesHint.wikipediaUrl && (
            <>
              {' '}
              ·{' '}
              <a href={speciesHint.wikipediaUrl} target="_blank" rel="noreferrer">
                Wikipedia
              </a>
            </>
          )}
          {speciesHint.description ? ` — ${speciesHint.description}` : null}
        </p>
      )}
      {speciesStatus && <p className="muted species-hint">{speciesStatus}</p>}
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
          Number of plants
          <input
            type="number"
            min="1"
            step="1"
            required
            value={form.plant_count}
            onChange={(e) => setField('plant_count', e.target.value)}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Top area (cm²)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.top_area_cm2}
            onChange={(e) => setField('top_area_cm2', e.target.value)}
          />
        </label>
      </div>
      <p className="muted">
        Number of plants is how many individuals this entry covers. Open top area credits
        yesterday’s rain against watering. Round pot: area ≈ π × (diameter cm / 2)².
      </p>
      <div className="form-row">
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
          Started as
          <select value={form.started_as} onChange={(e) => setField('started_as', e.target.value)}>
            <option value="">—</option>
            {STARTED_AS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
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
