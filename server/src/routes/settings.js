import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
import { settingsPatchSchema, validate } from '../lib/validate.js';
import * as settings from '../repos/settings.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const row = await settings.getSettings();
    if (!row) throw notFound('Settings not found');
    res.json(row);
  }),
);

router.patch(
  '/',
  validate(settingsPatchSchema),
  asyncHandler(async (req, res) => {
    const row = await settings.updateSettings(req.validated.body);
    if (!row) throw notFound('Settings not found');
    res.json(row);
  }),
);

export default router;
