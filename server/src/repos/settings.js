import { query } from '../db.js';

export async function getSettings(ownerId) {
  const { rows } = await query('SELECT * FROM settings WHERE owner_id = $1', [ownerId]);
  if (rows[0]) return rows[0];

  const { rows: created } = await query(
    `
      INSERT INTO settings (owner_id)
      VALUES ($1)
      ON CONFLICT (owner_id) DO NOTHING
      RETURNING *
    `,
    [ownerId],
  );
  if (created[0]) return created[0];

  const { rows: retry } = await query('SELECT * FROM settings WHERE owner_id = $1', [ownerId]);
  return retry[0] ?? null;
}

export async function updateSettings(ownerId, fields) {
  await getSettings(ownerId);
  const keys = ['timezone', 'units', 'latitude', 'longitude'].filter(
    (key) => fields[key] !== undefined,
  );
  if (keys.length === 0) return getSettings(ownerId);
  const assignments = keys.map((key, i) => `${key} = $${i + 1}`);
  const values = keys.map((key) => fields[key]);
  const { rows } = await query(
    `
      UPDATE settings
      SET ${assignments.join(', ')}, updated_at = now()
      WHERE owner_id = $${keys.length + 1}
      RETURNING *
    `,
    [...values, ownerId],
  );
  return rows[0] ?? null;
}
