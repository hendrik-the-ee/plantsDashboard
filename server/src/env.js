import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

export const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://plants:plants@127.0.0.1:5432/plants';
export const PORT = Number(process.env.PORT || 3001);
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const HOST = IS_PRODUCTION ? '0.0.0.0' : '127.0.0.1';
export const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(ROOT_DIR, 'data', 'uploads');
export const CLERK_PUBLISHABLE_KEY =
  process.env.CLERK_PUBLISHABLE_KEY ||
  process.env.VITE_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  '';
export const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || '';

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const VISION_MODEL = process.env.VISION_MODEL || 'gemini-3.6-flash';
export const CLIENT_DIST = path.join(ROOT_DIR, 'client', 'dist');
