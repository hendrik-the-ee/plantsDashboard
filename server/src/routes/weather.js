import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/errors.js';
import { fetchForecast } from '../lib/openMeteo.js';
import { buildWeatherAdvisories } from '../lib/weatherAdvice.js';
import { requireUserId } from '../middleware/ownership.js';
import { listPlantsWithStatus } from '../repos/plantStatus.js';
import * as settings from '../repos/settings.js';
import * as weather from '../repos/weather.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const row = await settings.getSettings(userId);
    if (!row) throw new HttpError(500, 'Settings not found');
    if (row.latitude == null || row.longitude == null) {
      throw new HttpError(400, 'Garden location not set');
    }

    const key = weather.locationKey(row.latitude, row.longitude);
    const cached = await weather.getCache(key);
    const now = Date.now();
    const cacheAgeMs = cached ? now - new Date(cached.fetched_at).getTime() : Infinity;
    const cacheFresh = cacheAgeMs < weather.CACHE_TTL_MS;

    let forecast;
    let fetchedAt;
    let stale = false;

    if (cached && cacheFresh) {
      forecast = cached.payload;
      fetchedAt = cached.fetched_at;
    } else {
      try {
        forecast = await fetchForecast(row.latitude, row.longitude, {
          units: row.units,
          timezone: row.timezone,
        });
        const saved = await weather.setCache(key, forecast);
        fetchedAt = saved.fetched_at;
      } catch (err) {
        if (cached) {
          forecast = cached.payload;
          fetchedAt = cached.fetched_at;
          stale = true;
        } else {
          throw err;
        }
      }
    }

    const plants = await listPlantsWithStatus(userId, { includeArchived: false });
    const advisories = buildWeatherAdvisories({
      days: forecast.days,
      plants,
      timezone: row.timezone,
      units: row.units,
    });

    res.json({
      location: { latitude: row.latitude, longitude: row.longitude },
      timezone: forecast.timezone ?? row.timezone,
      units: row.units,
      fetchedAt,
      cached: cacheFresh || stale,
      stale,
      yesterday: forecast.yesterday ?? null,
      days: forecast.days,
      advisories,
    });
  }),
);

export default router;
