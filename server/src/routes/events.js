import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
import { eventPatchSchema, idParamSchema, validate } from '../lib/validate.js';
import * as events from '../repos/events.js';

const router = Router();

router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(eventPatchSchema),
  asyncHandler(async (req, res) => {
    const existing = await events.getEvent(req.validated.params.id);
    if (!existing) throw notFound('Event not found');
    const updated = await events.updateEvent(req.validated.params.id, req.validated.body);
    res.json(updated);
  }),
);

router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const removed = await events.deleteEvent(req.validated.params.id);
    if (!removed) throw notFound('Event not found');
    res.json(removed);
  }),
);

export default router;
