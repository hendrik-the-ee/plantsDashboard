import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import morgan from 'morgan';
import { clerkMiddleware, clerkOptions, requireAuth } from './lib/auth.js';
import { CLIENT_DIST, HOST, IS_PRODUCTION, PORT, UPLOADS_DIR } from './env.js';
import { migrate, query, close } from './db.js';
import { errorHandler } from './lib/errors.js';
import plantsRouter from './routes/plants.js';
import eventsRouter from './routes/events.js';
import settingsRouter from './routes/settings.js';
import weatherRouter from './routes/weather.js';
import photosRouter, { photoRouter } from './routes/photos.js';
import recommendationsRouter from './routes/recommendations.js';

const app = express();

if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev'));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'down', error: err.message });
  }
});

app.use(clerkMiddleware(clerkOptions()));

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use('/uploads', express.static(UPLOADS_DIR, { index: false, fallthrough: false }));

app.use('/api', requireAuth());
app.use('/api/plants', plantsRouter);
app.use('/api/plants/:plantId/photos', photosRouter);
app.use('/api/photos', photoRouter);
app.use('/api/events', eventsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/recommendations', recommendationsRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (IS_PRODUCTION && fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use(errorHandler);

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
