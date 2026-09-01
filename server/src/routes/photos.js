import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notFound } from '../lib/errors.js';
import { photoUpload } from '../lib/upload.js';
import { loadOwnedPlant, requireUserId } from '../middleware/ownership.js';
import { idParamSchema, validate } from '../lib/validate.js';
import * as photos from '../repos/photos.js';
import { getPlant } from '../repos/plants.js';

const router = Router({ mergeParams: true });

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get(
  '/',
  loadOwnedPlant('plantId'),
  asyncHandler(async (req, res) => {
    res.json(await photos.listPhotos(req.plant.id, req.userId));
  }),
);

router.post(
  '/',
  uploadLimiter,
  loadOwnedPlant('plantId'),
  photoUpload.single('photo'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'photo file is required' });
      return;
    }
    const takenAt = req.body.taken_at || null;
    const row = await photos.createPhoto(req.plant.id, req.userId, {
      filePath: req.file.filename,
      bytes: req.file.size,
      takenAt,
    });
    res.status(201).json(row);
  }),
);

const photoRouter = Router();

photoRouter.delete(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const removed = await photos.deletePhoto(req.validated.params.id, userId);
    if (!removed) throw notFound('Photo not found');
    res.json(removed);
  }),
);

photoRouter.post(
  '/:id/analyze',
  analyzeLimiter,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const photo = await photos.getPhotoForOwner(req.validated.params.id, userId);
    if (!photo) throw notFound('Photo not found');

    const plant = await getPlant(photo.plant_id, userId);
    const analysis = await photos.createAnalysis(photo.id);
    photos.runAnalysis(analysis.id, photo, plant).catch(console.error);
    res.status(202).json({ analysisId: analysis.id, status: analysis.status });
  }),
);

photoRouter.get(
  '/:id/analysis',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const photo = await photos.getPhotoForOwner(req.validated.params.id, userId);
    if (!photo) throw notFound('Photo not found');

    const analysis = await photos.getLatestAnalysis(photo.id);
    if (!analysis) {
      res.json({ status: 'none' });
      return;
    }
    res.json(await photos.getAnalysisWithFindings(analysis.id));
  }),
);

export { photoRouter };
export default router;
