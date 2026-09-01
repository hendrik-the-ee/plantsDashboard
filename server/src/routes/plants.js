import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
import { lookupSpecies } from '../lib/plantLookup.js';
import { loadOwnedPlant, requireUserId } from '../middleware/ownership.js';
import {
  eventCreateSchema,
  idParamSchema,
  plantCreateSchema,
  plantPatchSchema,
  validate,
  waterSchema,
} from '../lib/validate.js';
import * as events from '../repos/events.js';
import { getPlantWithStatus, listPlantsWithStatus } from '../repos/plantStatus.js';
import * as plants from '../repos/plants.js';

const router = Router();

const speciesLookupSchema = z.object({
  q: z.string().trim().min(2, 'Query must be at least 2 characters'),
});

router.get(
  '/species-lookup',
  validate(speciesLookupSchema, 'query'),
  asyncHandler(async (req, res) => {
    res.json(await lookupSpecies(req.validated.query.q));
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const includeArchived =
      req.query.includeArchived === '1' || req.query.includeArchived === 'true';
    const q = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
    res.json(await listPlantsWithStatus(userId, { includeArchived, q }));
  }),
);

router.post(
  '/',
  validate(plantCreateSchema),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const plant = await plants.createPlant(userId, req.validated.body);
    res.status(201).json(plant);
  }),
);

router.get(
  '/:id/events',
  validate(idParamSchema, 'params'),
  loadOwnedPlant('id'),
  asyncHandler(async (req, res) => {
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    res.json(await events.listEvents(req.plant.id, req.userId, { type }));
  }),
);

router.post(
  '/:id/events',
  validate(idParamSchema, 'params'),
  validate(eventCreateSchema),
  loadOwnedPlant('id'),
  asyncHandler(async (req, res) => {
    const event = await events.createEvent(req.plant.id, req.userId, req.validated.body);
    res.status(201).json(event);
  }),
);

router.post(
  '/:id/water',
  validate(idParamSchema, 'params'),
  validate(waterSchema),
  loadOwnedPlant('id'),
  asyncHandler(async (req, res) => {
    const result = await events.quickWater(req.plant.id, req.userId, req.validated.body);
    if (result?.skipped) {
      res.status(200).json(result);
      return;
    }
    res.status(201).json(result);
  }),
);

router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const plant = await getPlantWithStatus(req.validated.params.id, userId);
    if (!plant) throw notFound('Plant not found');
    res.json(plant);
  }),
);

router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(plantPatchSchema),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const plant = await plants.updatePlant(req.validated.params.id, userId, req.validated.body);
    if (!plant) throw notFound('Plant not found');
    res.json(await getPlantWithStatus(plant.id, userId));
  }),
);

router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const plant = await plants.archivePlant(req.validated.params.id, userId);
    if (!plant) throw notFound('Plant not found');
    res.json(plant);
  }),
);

export default router;
