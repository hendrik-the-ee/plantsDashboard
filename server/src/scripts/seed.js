/**
 * Seed sample plants for a Clerk user.
 * Usage: SEED_OWNER_ID=user_xxx npm run seed -w server
 */
import { close, query } from '../db.js';

const ownerId = process.env.SEED_OWNER_ID;
if (!ownerId) {
  console.error('Set SEED_OWNER_ID to a Clerk user id (e.g. user_2abc...)');
  process.exit(1);
}

const samples = [
  {
    name: 'Cherry tomato',
    species: 'Solanum lycopersicum',
    planted_on: '2026-05-01',
    is_edible: true,
    days_to_maturity: 75,
    watering_interval_days: 3,
    fertilize_interval_days: 14,
    container_size_liters: 20,
    top_area_cm2: 900,
    plant_count: 1,
    soil_type: 'potting_mix',
    light_level: 'full_sun',
    started_as: 'seedling',
    notes: 'Balcony container crop',
  },
  {
    name: 'Basil',
    species: 'Ocimum basilicum',
    planted_on: '2026-06-10',
    is_edible: true,
    days_to_maturity: 45,
    watering_interval_days: 2,
    container_size_liters: 5,
    top_area_cm2: 400,
    plant_count: 2,
    soil_type: 'potting_mix',
    light_level: 'bright',
    started_as: 'seedling',
  },
];

async function main() {
  await query(
    `
      INSERT INTO settings (owner_id, timezone, units, latitude, longitude)
      VALUES ($1, 'America/New_York', 'metric', 40.7128, -74.0060)
      ON CONFLICT (owner_id) DO UPDATE
      SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, updated_at = now()
    `,
    [ownerId],
  );

  for (const sample of samples) {
    const keys = ['owner_id', ...Object.keys(sample)];
    const values = [ownerId, ...Object.values(sample)];
    const placeholders = keys.map((_, i) => `$${i + 1}`);
    const { rows } = await query(
      `
        INSERT INTO plants (${keys.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING id, name
      `,
      values,
    );
    const plant = rows[0];
    await query(
      `
        INSERT INTO care_events (plant_id, type, occurred_at, amount_ml)
        VALUES ($1, 'water', now() - interval '2 days', 750)
      `,
      [plant.id],
    );
    console.log(`Seeded ${plant.name} (#${plant.id})`);
  }
}

main()
  .then(() => close())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
