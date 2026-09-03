import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
import { requireUserId } from '../middleware/ownership.js';
import { settingsPatchSchema, validate } from '../lib/validate.js';
import * as settings from '../repos/settings.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const row = await settings.getSettings(userId);
    if (!row) throw notFound('Settings not found');
    res.json(row);
  }),
);

router.patch(
  '/',
  validate(settingsPatchSchema),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const row = await settings.updateSettings(userId, req.validated.body);
    if (!row) throw notFound('Settings not found');
    res.json(row);
  }),
);

export default router;
