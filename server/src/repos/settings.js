import { query } from '../db.js';

export async function getSettings() {
  const { rows } = await query('SELECT * FROM settings WHERE id = 1');
  return rows[0] ?? null;
}

export async function updateSettings(fields) {
  const keys = ['timezone', 'units', 'latitude', 'longitude'].filter(
    (key) => fields[key] !== undefined,
  );
  if (keys.length === 0) return getSettings();
  const assignments = keys.map((key, i) => `${key} = $${i + 1}`);
  const values = keys.map((key) => fields[key]);
  const { rows } = await query(
    `
      UPDATE settings
      SET ${assignments.join(', ')}, updated_at = now()
      WHERE id = 1
      RETURNING *
    `,
    values,
  );
  return rows[0] ?? null;
}
