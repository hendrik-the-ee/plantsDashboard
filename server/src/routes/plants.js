import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
import {
  idParamSchema,
  plantCreateSchema,
  plantPatchSchema,
  validate,
} from '../lib/validate.js';
import * as plants from '../repos/plants.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeArchived =
      req.query.includeArchived === '1' || req.query.includeArchived === 'true';
    res.json(await plants.listPlants({ includeArchived }));
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
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const plant = await plants.getPlant(req.validated.params.id);
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
    res.json(plant);
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
