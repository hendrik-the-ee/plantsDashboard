import { query } from '../db.js';

const COLUMNS = [
  'name',
  'species',
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

export async function listPlants(ownerId, { includeArchived = false } = {}) {
  const { rows } = await query(
    `
      SELECT *
      FROM plants
      WHERE owner_id = $1
        AND ($2::boolean OR archived_at IS NULL)
      ORDER BY archived_at IS NOT NULL, lower(name), id
    `,
    [ownerId, includeArchived],
  );
  return rows;
}

export async function getPlant(id, ownerId) {
  const { rows } = await query(
    'SELECT * FROM plants WHERE id = $1 AND owner_id = $2',
    [id, ownerId],
  );
  return rows[0] ?? null;
}

export async function createPlant(ownerId, fields) {
  const keys = ['owner_id', ...COLUMNS.filter((key) => fields[key] !== undefined)];
  const values = [ownerId, ...COLUMNS.filter((key) => fields[key] !== undefined).map((key) => fields[key])];
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

export async function updatePlant(id, ownerId, fields) {
  const keys = COLUMNS.filter((key) => fields[key] !== undefined);
  if (keys.length === 0) return getPlant(id, ownerId);
  const assignments = keys.map((key, i) => `${key} = $${i + 1}`);
  const values = keys.map((key) => fields[key]);
  const { rows } = await query(
    `
      UPDATE plants
      SET ${assignments.join(', ')}, updated_at = now()
      WHERE id = $${keys.length + 1} AND owner_id = $${keys.length + 2}
      RETURNING *
    `,
    [...values, id, ownerId],
  );
  return rows[0] ?? null;
}

export async function archivePlant(id, ownerId) {
  const { rows } = await query(
    `
      UPDATE plants
      SET archived_at = COALESCE(archived_at, now()), updated_at = now()
      WHERE id = $1 AND owner_id = $2
      RETURNING *
    `,
    [id, ownerId],
  );
  return rows[0] ?? null;
}

export async function searchPlants(ownerId, { q, includeArchived = false } = {}) {
  const params = [ownerId, includeArchived];
  let sql = `
    SELECT *
    FROM plants
    WHERE owner_id = $1
      AND ($2::boolean OR archived_at IS NULL)
  `;
  if (q) {
    params.push(`%${q}%`);
    sql += ` AND (name ILIKE $${params.length} OR species ILIKE $${params.length})`;
  }
  sql += ' ORDER BY archived_at IS NOT NULL, lower(name), id';
  const { rows } = await query(sql, params);
  return rows;
}
