import { SOIL_TYPES } from '../components/PlantForm.jsx';

const SOIL_LABELS = Object.fromEntries(SOIL_TYPES.map((o) => [o.value, o.label]));

export const EVENT_TYPES = [
  { value: 'water', label: 'Water' },
  { value: 'fertilize', label: 'Fertilize' },
  { value: 'prune', label: 'Prune' },
  { value: 'repot', label: 'Repot' },
  { value: 'harvest', label: 'Harvest' },
  { value: 'observation', label: 'Observation' },
];

export const YIELD_UNITS = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' },
  { value: 'count', label: 'count' },
];

export function toLocalInputValue(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localInputToIso(value) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

export function daysAgoLocalInput(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toLocalInputValue(date);
}

export function formatEventTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function summarizeEvent(event) {
  switch (event.type) {
    case 'water':
      return event.amount_ml != null ? `Watered ${event.amount_ml} ml` : 'Watered';
    case 'fertilize':
      return 'Fertilized';
    case 'prune':
      return 'Pruned';
    case 'harvest':
      return event.yield_amount != null
        ? `Harvested ${event.yield_amount} ${event.yield_unit ?? ''}`.trim()
        : 'Harvested';
    case 'repot': {
      const parts = [];
      if (
        event.previous_container_size_liters != null ||
        event.container_size_liters != null
      ) {
        parts.push(
          `${event.previous_container_size_liters ?? '?'} L → ${event.container_size_liters ?? '?'} L`,
        );
      }
      if (event.previous_soil_type || event.soil_type) {
        parts.push(
          `${SOIL_LABELS[event.previous_soil_type] ?? event.previous_soil_type ?? '?'} → ${SOIL_LABELS[event.soil_type] ?? event.soil_type ?? '?'}`,
        );
      }
      return parts.length ? `Repotted (${parts.join('; ')})` : 'Repotted';
    }
    case 'observation':
      return event.notes || 'Observation';
    default:
      return event.type;
  }
}
