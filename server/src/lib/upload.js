import crypto from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { UPLOADS_DIR } from '../env.js';
import { HttpError } from './errors.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    cb(new HttpError(400, 'Only JPEG, PNG, and WebP images are allowed'));
    return;
  }
  cb(null, true);
}

export const photoUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES, files: 1 },
});
