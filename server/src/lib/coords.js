/** Decimal places for garden lat/long everywhere. */
export const COORD_DECIMALS = 2;

export function roundCoord(value) {
  if (value == null) return null;
  return Number(Number(value).toFixed(COORD_DECIMALS));
}

export function formatCoord(value) {
  if (value == null || value === '') return null;
  return Number(value).toFixed(COORD_DECIMALS);
}

export function normalizeCoordFields(row) {
  if (!row) return row;
  return {
    ...row,
    latitude: row.latitude == null ? null : roundCoord(row.latitude),
    longitude: row.longitude == null ? null : roundCoord(row.longitude),
  };
}
