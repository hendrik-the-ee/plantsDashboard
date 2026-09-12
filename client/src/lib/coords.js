/** Decimal places for garden lat/long everywhere. */
export const COORD_DECIMALS = 2;

export function roundCoord(value) {
  if (value == null || value === '') return null;
  return Number(Number(value).toFixed(COORD_DECIMALS));
}

export function formatCoord(value) {
  if (value == null || value === '') return '';
  return Number(value).toFixed(COORD_DECIMALS);
}
