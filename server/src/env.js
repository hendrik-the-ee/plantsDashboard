import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

export const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://plants:plants@127.0.0.1:5432/plants';
export const PORT = Number(process.env.PORT || 3001);
export const HOST = '127.0.0.1';
export const UPLOADS_DIR = path.join(ROOT_DIR, 'data', 'uploads');
