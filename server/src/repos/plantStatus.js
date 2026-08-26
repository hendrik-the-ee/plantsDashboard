import { query } from '../db.js';
import {
  adjustWateringForRain,
  usualWaterMl,
} from '../lib/rainWatering.js';
import { getGardenYesterdayPrecipMm } from './gardenWeather.js';

const WATER_STATUS_SQL = `
  CASE
    WHEN ps.archived_at IS NOT NULL THEN NULL
    WHEN ps.next_water_due IS NULL THEN 'ok'
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
  const precipMm = await getGardenYesterdayPrecipMm();
  return rows.map((row) => withWaterSuggestion(row, precipMm));
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
  const plant = rows[0] ?? null;
  if (!plant) return null;
  const precipMm = await getGardenYesterdayPrecipMm();
  return withWaterSuggestion(plant, precipMm);
}
