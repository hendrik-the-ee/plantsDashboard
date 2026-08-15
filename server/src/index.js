import fs from 'node:fs';
import express from 'express';
import morgan from 'morgan';
import { HOST, PORT, UPLOADS_DIR } from './env.js';
import { migrate, query, close } from './db.js';
import { errorHandler } from './lib/errors.js';
import plantsRouter from './routes/plants.js';
import settingsRouter from './routes/settings.js';

const app = express();

app.use(morgan('dev'));
app.use(express.json());

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR, { index: false, fallthrough: false }));

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'down', error: err.message });
  }
});

app.use('/api/plants', plantsRouter);
app.use('/api/settings', settingsRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

// The API still listens when Postgres is down so /api/health can say so, and it keeps
// retrying so starting the database does not require restarting the server.
migrateWithRetry();

async function migrateWithRetry() {
  for (let attempt = 1; ; attempt++) {
    try {
      await migrate();
      return;
    } catch (err) {
      console.error(`[api] database unavailable (attempt ${attempt}): ${err.message}`);
      if (attempt === 1) {
        console.error('[api] start Postgres with: brew services start postgresql@16');
      }
      await new Promise((resolve) => setTimeout(resolve, 5000).unref());
    }
  }
}

const server = app.listen(PORT, HOST, () => {
  console.log(`[api] listening on http://${HOST}:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => close().finally(() => process.exit(0)));
  });
}
