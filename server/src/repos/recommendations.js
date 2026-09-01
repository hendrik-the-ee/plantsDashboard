import { query } from '../db.js';

export async function listDismissals(ownerId) {
  const { rows } = await query(
    'SELECT key, dismissed_at, snooze_until FROM recommendation_dismissals WHERE owner_id = $1',
    [ownerId],
  );
  return rows;
}

export async function dismissRecommendation(ownerId, key, { snoozeDays } = {}) {
  const snoozeUntil =
    snoozeDays != null
      ? new Date(Date.now() + Number(snoozeDays) * 24 * 60 * 60 * 1000)
      : null;

  const { rows } = await query(
    `
      INSERT INTO recommendation_dismissals (key, owner_id, snooze_until)
      VALUES ($1, $2, $3)
      ON CONFLICT (key, owner_id) DO UPDATE
      SET dismissed_at = now(), snooze_until = EXCLUDED.snooze_until
      RETURNING *
    `,
    [key, ownerId, snoozeUntil],
  );
  return rows[0];
}
