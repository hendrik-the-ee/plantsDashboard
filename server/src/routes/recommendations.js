import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { buildRecommendations } from '../lib/recommendations.js';
import { buildWeatherAdvisories } from '../lib/weatherAdvice.js';
import { fetchForecast } from '../lib/openMeteo.js';
import { requireUserId } from '../middleware/ownership.js';
import { validate } from '../lib/validate.js';
import { z } from 'zod';
import * as events from '../repos/events.js';
import { listPlantsWithStatus } from '../repos/plantStatus.js';
import * as photos from '../repos/photos.js';
import * as recommendations from '../repos/recommendations.js';
import * as settings from '../repos/settings.js';
import * as weather from '../repos/weather.js';

const router = Router();

const dismissSchema = z.object({
  snoozeDays: z.coerce.number().int().positive().optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const plantId = req.query.plantId ? Number(req.query.plantId) : undefined;

    const [plants, dismissals, recentEvents, visionFindings, settingsRow] = await Promise.all([
      listPlantsWithStatus(userId, { includeArchived: false }),
      recommendations.listDismissals(userId),
      events.listRecentEventsForOwner(userId),
      photos.listRecentFindingsForOwner(userId),
      settings.getSettings(userId),
    ]);

    const scopedPlants = plantId ? plants.filter((plant) => plant.id === plantId) : plants;
    const eventsByPlant = new Map();
    for (const event of recentEvents) {
      const list = eventsByPlant.get(event.plant_id) ?? [];
      list.push(event);
      eventsByPlant.set(event.plant_id, list);
    }

    let weatherAdvisories = [];
    if (settingsRow?.latitude != null && settingsRow?.longitude != null) {
      try {
        const key = weather.locationKey(settingsRow.latitude, settingsRow.longitude);
        const cached = await weather.getCache(key);
        let forecast = cached?.payload;
        if (!cached || Date.now() - new Date(cached.fetched_at).getTime() >= weather.CACHE_TTL_MS) {
          forecast = await fetchForecast(settingsRow.latitude, settingsRow.longitude, {
            units: settingsRow.units,
            timezone: settingsRow.timezone,
          });
          await weather.setCache(key, forecast);
        }
        weatherAdvisories = buildWeatherAdvisories({
          days: forecast.days,
          plants: scopedPlants,
          timezone: settingsRow.timezone,
          units: settingsRow.units,
        });
      } catch {
        // weather advisories are optional for the feed
      }
    }

    const items = buildRecommendations({
      plants: scopedPlants,
      eventsByPlant,
      dismissals,
      weatherAdvisories,
      visionFindings,
      timezone: settingsRow?.timezone ?? 'UTC',
    });

    res.json(items);
  }),
);

router.post(
  '/:key/dismiss',
  validate(
    z.object({
      key: z.string().min(1),
    }),
    'params',
  ),
  validate(dismissSchema),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const row = await recommendations.dismissRecommendation(
      userId,
      req.validated.params.key,
      req.validated.body,
    );
    res.json(row);
  }),
);

export default router;
