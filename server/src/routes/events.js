import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
import { loadOwnedEvent } from '../middleware/ownership.js';
import { eventPatchSchema, idParamSchema, validate } from '../lib/validate.js';
import * as events from '../repos/events.js';

const router = Router();

router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(eventPatchSchema),
  loadOwnedEvent('id'),
  asyncHandler(async (req, res) => {
    const updated = await events.updateEvent(req.event.id, req.userId, req.validated.body);
    if (!updated) throw notFound('Event not found');
    res.json(updated);
  }),
);

router.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  loadOwnedEvent('id'),
  asyncHandler(async (req, res) => {
    const removed = await events.deleteEvent(req.event.id, req.userId);
    if (!removed) throw notFound('Event not found');
    res.json(removed);
  }),
);

export default router;
