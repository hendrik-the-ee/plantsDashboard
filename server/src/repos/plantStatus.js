import { query, tx } from '../db.js';

const WATER_STATUS_SQL = `
  CASE
    WHEN ps.archived_at IS NOT NULL THEN NULL
    WHEN ps.next_water_due IS NULL THEN 'ok'
    WHEN ps.next_water_due < (now() AT TIME ZONE s.timezone)::date THEN 'overdue'
    WHEN ps.next_water_due = (now() AT TIME ZONE s.timezone)::date THEN 'due_today'
    ELSE 'ok'
  END AS water_status
`;

export async function listPlantsWithStatus({ includeArchived = false } = {}) {
  const { rows } = await query(
    `
      SELECT ps.*, ${WATER_STATUS_SQL}
      FROM plant_status ps
      CROSS JOIN settings s
      WHERE $1::boolean OR ps.archived_at IS NULL
      ORDER BY ps.archived_at IS NOT NULL, lower(ps.name), ps.id
    `,
    [includeArchived],
  );
  return rows;
}

export async function getPlantWithStatus(id) {
  const { rows } = await query(
    `
      SELECT ps.*, ${WATER_STATUS_SQL}
      FROM plant_status ps
      CROSS JOIN settings s
      WHERE ps.id = $1
    `,
    [id],
  );
  return rows[0] ?? null;
}

/** Default ml when there is no water history: ~10% of container volume, min 250 ml. */
export function estimateWaterMl(containerSizeLiters) {
  if (containerSizeLiters == null) return 500;
  return Math.max(250, Math.round(Number(containerSizeLiters) * 100));
}
