import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { DATABASE_URL } from './env.js';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

// Arbitrary but fixed: two processes racing to migrate must pick the same key.
// Sent as a string because it exceeds the safe integer range.
const MIGRATION_LOCK_KEY = '8123467120931';

export const pool = new pg.Pool({ connectionString: DATABASE_URL });

pool.on('error', (err) => {
  console.error('[db] idle client error', err);
});

export function query(text, params) {
  return pool.query(text, params);
}

/** Runs fn with a dedicated client inside a transaction, rolling back on throw. */
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function migrate() {
  const client = await pool.connect();
  try {
    // Held until this client is released, so a nodemon restart mid-migration
    // cannot start a second concurrent run.
    await client.query('SELECT pg_advisory_lock($1::bigint)', [MIGRATION_LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.filename));

    const files = (await fs.readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    const ran = [];
    for (const filename of files) {
      if (applied.has(filename)) continue;
      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, filename), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`migration ${filename} failed: ${err.message}`, { cause: err });
      }
      ran.push(filename);
      console.log(`[db] applied ${filename}`);
    }
    if (ran.length === 0) console.log('[db] schema up to date');
    return ran;
  } finally {
    await client
      .query('SELECT pg_advisory_unlock($1::bigint)', [MIGRATION_LOCK_KEY])
      .catch(() => {});
    client.release();
  }
}

export async function close() {
  await pool.end();
}
