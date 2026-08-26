import { query } from '../db.js';

const COLUMNS = [
  'name',
  'species',
  'latitude',
  'longitude',
  'acquired_on',
  'planted_on',
  'is_edible',
  'days_to_maturity',
  'watering_interval_days',
  'fertilize_interval_days',
  'container_size_liters',
  'top_area_cm2',
  'plant_count',
  'soil_type',
  'light_level',
  'started_as',
  'notes',
];

export async function listPlants({ includeArchived = false } = {}) {
  const { rows } = await query(
    `
      SELECT *
      FROM plants
      WHERE $1::boolean OR archived_at IS NULL
      ORDER BY archived_at IS NOT NULL, lower(name), id
    `,
    [includeArchived],
  );
  return rows;
}

export async function getPlant(id) {
  const { rows } = await query('SELECT * FROM plants WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function createPlant(fields) {
  const keys = COLUMNS.filter((key) => fields[key] !== undefined);
  const values = keys.map((key) => fields[key]);
  const placeholders = keys.map((_, i) => `$${i + 1}`);
  const { rows } = await query(
    `
      INSERT INTO plants (${keys.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `,
    values,
  );
  return rows[0];
}

export async function updatePlant(id, fields) {
  const keys = COLUMNS.filter((key) => fields[key] !== undefined);
  if (keys.length === 0) return getPlant(id);
  const assignments = keys.map((key, i) => `${key} = $${i + 1}`);
  const values = keys.map((key) => fields[key]);
  const { rows } = await query(
    `
      UPDATE plants
      SET ${assignments.join(', ')}, updated_at = now()
      WHERE id = $${keys.length + 1}
      RETURNING *
    `,
    [...values, id],
  );
  return rows[0] ?? null;
}

export async function archivePlant(id) {
  const { rows } = await query(
    `
      UPDATE plants
      SET archived_at = COALESCE(archived_at, now()), updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [id],
  );
  return rows[0] ?? null;
}
