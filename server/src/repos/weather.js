import { query } from '../db.js';

export const CACHE_TTL_MS = 3 * 60 * 60 * 1000;
export const CACHE_DECIMALS = 2;

// v3: yesterday precip from Archive API (forecast past_days hindcast is unreliable).
export function locationKey(latitude, longitude) {
  return `v3:${Number(latitude).toFixed(CACHE_DECIMALS)},${Number(longitude).toFixed(CACHE_DECIMALS)}`;
}

export async function getCache(key) {
  const { rows } = await query(
    'SELECT location_key, fetched_at, payload FROM weather_cache WHERE location_key = $1',
    [key],
  );
  return rows[0] ?? null;
}

export async function setCache(key, payload) {
  const { rows } = await query(
    `
      INSERT INTO weather_cache (location_key, fetched_at, payload)
      VALUES ($1, now(), $2::jsonb)
      ON CONFLICT (location_key) DO UPDATE
      SET fetched_at = now(), payload = EXCLUDED.payload
      RETURNING location_key, fetched_at, payload
    `,
    [key, JSON.stringify(payload)],
  );
  return rows[0];
}
