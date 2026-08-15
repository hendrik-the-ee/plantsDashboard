import { migrate, close } from '../db.js';

try {
  await migrate();
} catch (err) {
  console.error(`[migrate] ${err.message}`);
  process.exitCode = 1;
} finally {
  await close();
}
