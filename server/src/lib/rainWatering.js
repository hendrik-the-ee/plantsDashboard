/** Fraction of rain assumed to land in the pot (canopy, splash, runoff). */
export const CAPTURE_FACTOR = 0.75;

/** Floor so a fully rain-covered pot suggests skipping rather than a token water. */
export const MIN_WATER_ML = 0;

/**
 * Volume of rain that lands on an open top (ml).
 * 1 cm² × 1 mm = 0.1 ml.
 */
export function rainVolumeMl(topAreaCm2, precipMm) {
  if (topAreaCm2 == null || precipMm == null) return 0;
  const area = Number(topAreaCm2);
  const precip = Number(precipMm);
  if (!(area > 0) || !(precip > 0)) return 0;
  return area * precip * 0.1;
}

/**
 * Convert archive/forecast precip into millimetres for watering math.
 */
export function precipToMm(amount, units = 'metric') {
  if (amount == null || Number.isNaN(Number(amount))) return null;
  const value = Number(amount);
  return units === 'imperial' ? value * 25.4 : value;
}

/**
 * @returns {{
 *   usualMl: number,
 *   suggestedMl: number,
 *   rainMl: number,
 *   creditMl: number,
 *   precipMm: number | null,
 *   adjusted: boolean,
 *   rainCovered: boolean,
 * }}
 */
export function adjustWateringForRain({
  usualMl,
  topAreaCm2,
  precipMm,
  captureFactor = CAPTURE_FACTOR,
  minMl = MIN_WATER_ML,
} = {}) {
  const usual = Math.max(0, Math.round(Number(usualMl) || 0));
  const rainMl = Math.round(rainVolumeMl(topAreaCm2, precipMm));
  const creditMl = Math.round(captureFactor * rainMl);
  const suggestedMl = Math.max(minMl, usual - creditMl);
  const adjusted = creditMl > 0 && suggestedMl < usual;
  return {
    usualMl: usual,
    suggestedMl,
    rainMl,
    creditMl,
    precipMm: precipMm == null ? null : Number(precipMm),
    adjusted,
    rainCovered: adjusted && suggestedMl <= 0,
  };
}

export function usualWaterMl(plant, estimateWaterMl) {
  if (plant.last_amount_ml != null) return Number(plant.last_amount_ml);
  return estimateWaterMl(plant.container_size_liters);
}
