import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
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

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeArchived =
      req.query.includeArchived === '1' || req.query.includeArchived === 'true';
    res.json(await listPlantsWithStatus({ includeArchived }));
  }),
);

router.post(
  '/',
  validate(plantCreateSchema),
  asyncHandler(async (req, res) => {
    const plant = await plants.createPlant(req.validated.body);
    res.status(201).json(plant);
  }),
);

router.get(
  '/:id/events',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const plant = await plants.getPlant(req.validated.params.id);
    if (!plant) throw notFound('Plant not found');
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    res.json(await events.listEvents(req.validated.params.id, { type }));
  }),
);

router.post(
  '/:id/events',
  validate(idParamSchema, 'params'),
  validate(eventCreateSchema),
  asyncHandler(async (req, res) => {
    const plant = await plants.getPlant(req.validated.params.id);
    if (!plant) throw notFound('Plant not found');
    const event = await events.createEvent(req.validated.params.id, req.validated.body);
    res.status(201).json(event);
  }),
);

router.post(
  '/:id/water',
  validate(idParamSchema, 'params'),
  validate(waterSchema),
  asyncHandler(async (req, res) => {
    const plant = await plants.getPlant(req.validated.params.id);
    if (!plant) throw notFound('Plant not found');
    const result = await events.quickWater(req.validated.params.id, req.validated.body);
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
    const plant = await getPlantWithStatus(req.validated.params.id);
    if (!plant) throw notFound('Plant not found');
    res.json(plant);
  }),
);

router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(plantPatchSchema),
  asyncHandler(async (req, res) => {
    const plant = await plants.updatePlant(req.validated.params.id, req.validated.body);
    if (!plant) throw notFound('Plant not found');
    res.json(await getPlantWithStatus(plant.id));
  }),
);

router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const plant = await plants.archivePlant(req.validated.params.id);
    if (!plant) throw notFound('Plant not found');
    res.json(plant);
  }),
);

export default router;
