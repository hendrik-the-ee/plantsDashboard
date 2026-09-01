import fs from 'node:fs/promises';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { GEMINI_API_KEY, VISION_MODEL } from '../env.js';

const findingSchema = z.object({
  issue: z.string(),
  severity: z.enum(['info', 'low', 'medium', 'high']),
  confidence: z.number().min(0).max(1),
  recommendation: z.string(),
});

const analysisSchema = z.object({
  health_score: z.number().min(0).max(100).nullable().optional(),
  growth_stage: z.string().nullable().optional(),
  estimated_harvest_on: z.string().nullable().optional(),
  findings: z.array(findingSchema).default([]),
});

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    health_score: { type: 'number', nullable: true },
    growth_stage: { type: 'string', nullable: true },
    estimated_harvest_on: { type: 'string', nullable: true },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          issue: { type: 'string' },
          severity: { type: 'string', enum: ['info', 'low', 'medium', 'high'] },
          confidence: { type: 'number' },
          recommendation: { type: 'string' },
        },
        required: ['issue', 'severity', 'confidence', 'recommendation'],
      },
    },
  },
  required: ['findings'],
};

function formatGardenLocation(gardenLocation) {
  if (gardenLocation?.latitude == null || gardenLocation?.longitude == null) {
    return null;
  }
  return `${Number(gardenLocation.latitude).toFixed(5)}, ${Number(gardenLocation.longitude).toFixed(5)}`;
}

function buildPrompt(plantContext) {
  const lines = [
    'Analyze this plant photo for a home gardener.',
    'Return JSON matching the schema with health_score (0-100), growth_stage, estimated_harvest_on (ISO date or null), and findings.',
    '',
    'Plant context:',
    `- Name: ${plantContext.name}`,
    `- Species: ${plantContext.species ?? 'unknown'}`,
    `- Planted: ${plantContext.planted_on ?? 'unknown'}`,
    `- Container: ${plantContext.container_size_liters ?? 'unknown'} L`,
    `- Soil: ${plantContext.soil_type ?? 'unknown'}`,
    `- Light: ${plantContext.light_level ?? 'unknown'}`,
    `- Garden location: ${formatGardenLocation(plantContext.gardenLocation) ?? 'unknown'}`,
  ];
  if (plantContext.recentEvents?.length) {
    lines.push('- Recent care:');
    for (const event of plantContext.recentEvents) {
      lines.push(`  - ${event.type} at ${event.occurred_at}`);
    }
  }
  return lines.join('\n');
}

/** Short record of what was sent with the photo (stored with the analysis). */
export function buildPromptSummary(plantContext) {
  const gardenCoords = formatGardenLocation(plantContext.gardenLocation);
  const details = [
    plantContext.name,
    plantContext.species || null,
    plantContext.planted_on ? `planted ${plantContext.planted_on}` : null,
    gardenCoords ? `garden ${gardenCoords}` : null,
    plantContext.container_size_liters != null
      ? `${plantContext.container_size_liters} L container`
      : null,
    plantContext.soil_type || null,
    plantContext.light_level ? `${plantContext.light_level} light` : null,
  ].filter(Boolean);

  let summary = `Analyze plant photo — ${details.join(', ')}.`;
  if (plantContext.recentEvents?.length) {
    const care = plantContext.recentEvents
      .slice(0, 5)
      .map((event) => {
        const day = event.occurred_at ? String(event.occurred_at).slice(0, 10) : '';
        return day ? `${event.type} (${day})` : event.type;
      })
      .join(', ');
    summary += ` Recent care: ${care}.`;
  }
  return summary;
}

export async function analyzePhoto(absPath, plantContext) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const promptSummary = buildPromptSummary(plantContext);
  const bytes = await fs.readFile(absPath);
  const mimeType = absPath.endsWith('.png')
    ? 'image/png'
    : absPath.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: VISION_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: buildPrompt(plantContext) },
          { inlineData: { mimeType, data: bytes.toString('base64') } },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Empty response from vision model');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Vision model returned invalid JSON');
  }

  const validated = analysisSchema.parse(parsed);
  return { validated, raw: parsed, promptSummary };
}
