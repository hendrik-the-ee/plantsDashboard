import { fetchYesterdayPrecipMm } from '../lib/openMeteo.js';
import { precipToMm } from '../lib/rainWatering.js';
import * as settings from './settings.js';
import * as weather from './weather.js';

/**
 * Yesterday's garden rainfall in millimetres, or null if unknown / no location.
 * Prefers a fresh weather_cache row; otherwise hits the Archive API in mm.
 */
export async function getGardenYesterdayPrecipMm(ownerId) {
  const row = await settings.getSettings(ownerId);
  if (!row || row.latitude == null || row.longitude == null) return null;

  const key = weather.locationKey(row.latitude, row.longitude);
  const cached = await weather.getCache(key);
  const cacheAgeMs = cached ? Date.now() - new Date(cached.fetched_at).getTime() : Infinity;

  if (cached && cacheAgeMs < weather.CACHE_TTL_MS) {
    const yesterday = cached.payload?.yesterday;
    if (yesterday && !yesterday.unavailable && yesterday.precipAmount != null) {
      const units = cached.payload.units ?? row.units;
      return precipToMm(yesterday.precipAmount, units);
    }
  }

  const fetched = await fetchYesterdayPrecipMm(row.latitude, row.longitude, {
    timezone: row.timezone,
  });
  return fetched?.precipAmount ?? null;
}
