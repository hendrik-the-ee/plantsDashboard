import { asyncHandler } from '../lib/asyncHandler.js';
import { getUserId } from '../lib/auth.js';
import { forbidden, notFound } from '../lib/errors.js';
import * as events from '../repos/events.js';
import * as plants from '../repos/plants.js';

export function requireUserId(req) {
  const userId = getUserId(req);
  if (!userId) throw forbidden('Authentication required');
  return userId;
}

export function loadOwnedPlant(paramName = 'id') {
  return asyncHandler(async (req, _res, next) => {
    const userId = requireUserId(req);
    const plantId = Number(req.params[paramName]);
    const plant = await plants.getPlant(plantId, userId);
    if (!plant) throw notFound('Plant not found');
    req.plant = plant;
    req.userId = userId;
    next();
  });
}

export function loadOwnedEvent(paramName = 'id') {
  return asyncHandler(async (req, _res, next) => {
    const userId = requireUserId(req);
    const eventId = Number(req.params[paramName]);
    const event = await events.getEventForOwner(eventId, userId);
    if (!event) throw notFound('Event not found');
    req.event = event;
    req.userId = userId;
    next();
  });
}
