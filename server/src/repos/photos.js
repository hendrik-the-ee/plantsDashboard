import fs from 'node:fs/promises';
import path from 'node:path';
import { query, tx } from '../db.js';
import { UPLOADS_DIR } from '../env.js';
import { analyzePhoto, buildPromptSummary } from '../lib/vision.js';
import { getPlant } from './plants.js';
import { listEvents } from './events.js';
import * as settings from './settings.js';

function gardenLocationFromSettings(row) {
  if (!row || row.latitude == null || row.longitude == null) return null;
  return {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  };
}

async function buildPlantContext(plant) {
  const [recentEvents, settingsRow] = await Promise.all([
    listEvents(plant.id, plant.owner_id, {}),
    settings.getSettings(plant.owner_id),
  ]);
  return {
    ...plant,
    recentEvents: recentEvents.slice(0, 5),
    gardenLocation: gardenLocationFromSettings(settingsRow),
  };
}

export async function listPhotos(plantId, ownerId) {
  const { rows } = await query(
    `
      SELECT pp.*
      FROM plant_photos pp
      JOIN plants p ON p.id = pp.plant_id
      WHERE pp.plant_id = $1 AND p.owner_id = $2
      ORDER BY pp.taken_at DESC, pp.id DESC
    `,
    [plantId, ownerId],
  );
  return rows;
}

export async function getPhotoForOwner(photoId, ownerId) {
  const { rows } = await query(
    `
      SELECT pp.*
      FROM plant_photos pp
      JOIN plants p ON p.id = pp.plant_id
      WHERE pp.id = $1 AND p.owner_id = $2
    `,
    [photoId, ownerId],
  );
  return rows[0] ?? null;
}

export async function createPhoto(plantId, ownerId, { filePath, bytes, takenAt }) {
  const plant = await getPlant(plantId, ownerId);
  if (!plant) return null;

  const { rows } = await query(
    `
      INSERT INTO plant_photos (plant_id, file_path, bytes, taken_at)
      VALUES ($1, $2, $3, COALESCE($4::timestamptz, now()))
      RETURNING *
    `,
    [plantId, filePath, bytes ?? null, takenAt ?? null],
  );
  return rows[0];
}

export async function deletePhoto(photoId, ownerId) {
  const photo = await getPhotoForOwner(photoId, ownerId);
  if (!photo) return null;

  await query('DELETE FROM plant_photos WHERE id = $1', [photoId]);
  try {
    await fs.unlink(path.join(UPLOADS_DIR, photo.file_path));
  } catch {
    // file may already be gone
  }
  return photo;
}

export async function getLatestAnalysis(photoId) {
  const { rows } = await query(
    `
      SELECT *
      FROM photo_analyses
      WHERE photo_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [photoId],
  );
  return rows[0] ?? null;
}

export async function getAnalysisWithFindings(analysisId) {
  const { rows } = await query('SELECT * FROM photo_analyses WHERE id = $1', [analysisId]);
  const analysis = rows[0] ?? null;
  if (!analysis) return null;

  const { rows: findings } = await query(
    'SELECT * FROM analysis_findings WHERE analysis_id = $1 ORDER BY id',
    [analysisId],
  );
  return { ...analysis, findings };
}

export async function createAnalysis(photoId) {
  const { rows } = await query(
    `
      INSERT INTO photo_analyses (photo_id, status)
      VALUES ($1, 'queued')
      RETURNING *
    `,
    [photoId],
  );
  return rows[0];
}

export async function runAnalysis(analysisId, photo, plant) {
  await query(
    `UPDATE photo_analyses SET status = 'running' WHERE id = $1`,
    [analysisId],
  );

  try {
    const absPath = path.join(UPLOADS_DIR, photo.file_path);
    const plantContext = await buildPlantContext(plant);
    const promptSummary = buildPromptSummary(plantContext);
    const { validated, raw } = await analyzePhoto(absPath, plantContext);

    await tx(async (client) => {
      await client.query(
        `
          UPDATE photo_analyses
          SET status = 'done',
              model = $2,
              health_score = $3,
              growth_stage = $4,
              estimated_harvest_on = $5,
              raw = $6::jsonb,
              prompt_summary = $7,
              completed_at = now()
          WHERE id = $1
        `,
        [
          analysisId,
          process.env.VISION_MODEL || 'gemini-3.6-flash',
          validated.health_score ?? null,
          validated.growth_stage ?? null,
          validated.estimated_harvest_on ?? null,
          JSON.stringify(raw),
          promptSummary,
        ],
      );

      for (const finding of validated.findings) {
        await client.query(
          `
            INSERT INTO analysis_findings (analysis_id, issue, severity, confidence, recommendation)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            analysisId,
            finding.issue,
            finding.severity,
            finding.confidence,
            finding.recommendation,
          ],
        );
      }
    });
  } catch (err) {
    const plantContext = await buildPlantContext(plant).catch(() => ({
      ...plant,
      recentEvents: [],
      gardenLocation: null,
    }));
    const promptSummary = buildPromptSummary(plantContext);
    await query(
      `
        UPDATE photo_analyses
        SET status = 'failed', error = $2, prompt_summary = $3, completed_at = now()
        WHERE id = $1
      `,
      [analysisId, err.message, promptSummary],
    );
  }
}

export async function listRecentFindingsForOwner(ownerId, { limit = 20 } = {}) {
  const { rows } = await query(
    `
      SELECT af.*,
             pa.photo_id,
             pa.health_score,
             pa.completed_at AS analysis_completed_at,
             pp.plant_id,
             p.name AS plant_name
      FROM analysis_findings af
      JOIN photo_analyses pa ON pa.id = af.analysis_id
      JOIN plant_photos pp ON pp.id = pa.photo_id
      JOIN plants p ON p.id = pp.plant_id
      WHERE p.owner_id = $1 AND pa.status = 'done'
      ORDER BY pa.completed_at DESC NULLS LAST, af.id DESC
      LIMIT $2
    `,
    [ownerId, limit],
  );
  return rows;
}

export async function getLatestPhotoForPlant(plantId) {
  const { rows } = await query(
    `
      SELECT *
      FROM plant_photos
      WHERE plant_id = $1
      ORDER BY taken_at DESC, id DESC
      LIMIT 1
    `,
    [plantId],
  );
  return rows[0] ?? null;
}
