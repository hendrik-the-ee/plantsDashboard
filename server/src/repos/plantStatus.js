import { query } from '../db.js';
import {
  adjustWateringForRain,
  usualWaterMl,
} from '../lib/rainWatering.js';
import { getGardenYesterdayPrecipMm } from './gardenWeather.js';

const WATER_STATUS_SQL = `
  CASE
    WHEN ps.archived_at IS NOT NULL THEN NULL
    WHEN ps.next_water_due IS NULL THEN 'overdue'
    WHEN ps.next_water_due < (now() AT TIME ZONE s.timezone)::date THEN 'overdue'
    WHEN ps.next_water_due = (now() AT TIME ZONE s.timezone)::date THEN 'due_today'
    ELSE 'ok'
  END AS water_status
`;

/** Default ml when there is no water history: ~10% of container volume, min 250 ml. */
export function estimateWaterMl(containerSizeLiters) {
  if (containerSizeLiters == null) return 500;
  return Math.max(250, Math.round(Number(containerSizeLiters) * 100));
}

function withWaterSuggestion(plant, precipMm) {
  const usual = usualWaterMl(plant, estimateWaterMl);
  const adjustment = adjustWateringForRain({
    usualMl: usual,
    topAreaCm2: plant.top_area_cm2,
    precipMm,
  });
  return {
    ...plant,
    usual_water_ml: adjustment.usualMl,
    suggested_water_ml: adjustment.suggestedMl,
    rain_credit_ml: adjustment.creditMl,
    rain_volume_ml: adjustment.rainMl,
    rain_precip_mm: adjustment.precipMm,
    water_rain_adjusted: adjustment.adjusted,
    water_rain_covered: adjustment.rainCovered,
  };
}

const LATEST_PHOTO_SQL = `
  (
    SELECT pp.file_path
    FROM plant_photos pp
    WHERE pp.plant_id = ps.id
    ORDER BY pp.taken_at DESC, pp.id DESC
    LIMIT 1
  ) AS latest_photo_path
`;

export async function listPlantsWithStatus(ownerId, { includeArchived = false, q } = {}) {
  const params = [ownerId, includeArchived];
  let sql = `
    SELECT ps.*, ${WATER_STATUS_SQL}, ${LATEST_PHOTO_SQL}
    FROM plant_status ps
    JOIN settings s ON s.owner_id = ps.owner_id
    WHERE ps.owner_id = $1
      AND ($2::boolean OR ps.archived_at IS NULL)
  `;
  if (q) {
    params.push(`%${q}%`);
    sql += ` AND (ps.name ILIKE $${params.length} OR ps.species ILIKE $${params.length})`;
  }
  sql += ' ORDER BY ps.archived_at IS NOT NULL, lower(ps.name), ps.id';
  const { rows } = await query(sql, params);
  const precipMm = await getGardenYesterdayPrecipMm(ownerId);
  return rows.map((row) => withWaterSuggestion(row, precipMm));
}

export async function getPlantWithStatus(id, ownerId) {
  const { rows } = await query(
    `
      SELECT ps.*, ${WATER_STATUS_SQL}, ${LATEST_PHOTO_SQL}
      FROM plant_status ps
      JOIN settings s ON s.owner_id = ps.owner_id
      WHERE ps.id = $1 AND ps.owner_id = $2
    `,
    [id, ownerId],
  );
  const plant = rows[0] ?? null;
  if (!plant) return null;
  const precipMm = await getGardenYesterdayPrecipMm(ownerId);
  return withWaterSuggestion(plant, precipMm);
}
