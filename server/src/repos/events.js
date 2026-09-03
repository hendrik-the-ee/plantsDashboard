import { query, tx } from '../db.js';
import { getPlantWithStatus } from './plantStatus.js';
import { getPlant } from './plants.js';

export async function listEvents(plantId, ownerId, { type } = {}) {
  const params = [plantId, ownerId];
  let sql = `
    SELECT e.*
    FROM care_events e
    JOIN plants p ON p.id = e.plant_id
    WHERE e.plant_id = $1 AND p.owner_id = $2
  `;
  if (type) {
    params.push(type);
    sql += ` AND e.type = $${params.length}`;
  }
  sql += ' ORDER BY e.occurred_at DESC, e.id DESC';
  const { rows } = await query(sql, params);
  return rows;
}

export async function getEvent(id) {
  const { rows } = await query('SELECT * FROM care_events WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function getEventForOwner(id, ownerId) {
  const { rows } = await query(
    `
      SELECT e.*
      FROM care_events e
      JOIN plants p ON p.id = e.plant_id
      WHERE e.id = $1 AND p.owner_id = $2
    `,
    [id, ownerId],
  );
  return rows[0] ?? null;
}

async function insertEvent(client, plantId, fields) {
  const keys = [
    'type',
    'occurred_at',
    'amount_ml',
    'yield_amount',
    'yield_unit',
    'container_size_liters',
    'previous_container_size_liters',
    'soil_type',
    'previous_soil_type',
    'notes',
  ].filter((key) => fields[key] !== undefined);

  const values = [plantId, ...keys.map((key) => fields[key])];
  const columns = ['plant_id', ...keys];
  const placeholders = columns.map((_, i) => `$${i + 1}`);

  const { rows } = await client.query(
    `
      INSERT INTO care_events (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `,
    values,
  );
  return rows[0];
}

export async function createEvent(plantId, ownerId, fields) {
  const plant = await getPlant(plantId, ownerId);
  if (!plant) return null;

  if (fields.type === 'repot') {
    return tx(async (client) => {
      const occurredAt = fields.occurred_at ?? new Date();
      const newContainer =
        fields.container_size_liters !== undefined
          ? fields.container_size_liters
          : plant.container_size_liters;
      const newSoil = fields.soil_type !== undefined ? fields.soil_type : plant.soil_type;

      const event = await insertEvent(client, plantId, {
        type: 'repot',
        occurred_at: occurredAt,
        container_size_liters: newContainer,
        previous_container_size_liters: plant.container_size_liters,
        soil_type: newSoil,
        previous_soil_type: plant.soil_type,
        notes: fields.notes ?? null,
      });

      const plantPatch = {};
      if (fields.container_size_liters !== undefined) {
        plantPatch.container_size_liters = fields.container_size_liters;
      }
      if (fields.soil_type !== undefined) {
        plantPatch.soil_type = fields.soil_type;
      }
      if (Object.keys(plantPatch).length > 0) {
        const keys = Object.keys(plantPatch);
        const assignments = keys.map((key, i) => `${key} = $${i + 1}`);
        await client.query(
          `
            UPDATE plants
            SET ${assignments.join(', ')}, updated_at = now()
            WHERE id = $${keys.length + 1} AND owner_id = $${keys.length + 2}
          `,
          [...keys.map((key) => plantPatch[key]), plantId, ownerId],
        );
      }

      return event;
    });
  }

  const payload = {
    type: fields.type,
    occurred_at: fields.occurred_at ?? new Date(),
    notes: fields.notes ?? null,
  };
  if (fields.amount_ml !== undefined) payload.amount_ml = fields.amount_ml;
  if (fields.yield_amount !== undefined) payload.yield_amount = fields.yield_amount;
  if (fields.yield_unit !== undefined) payload.yield_unit = fields.yield_unit;

  return insertEvent({ query: (...args) => query(...args) }, plantId, payload);
}

export async function updateEvent(id, ownerId, fields) {
  const existing = await getEventForOwner(id, ownerId);
  if (!existing) return null;

  const allowed = [
    'occurred_at',
    'amount_ml',
    'yield_amount',
    'yield_unit',
    'notes',
  ];
  const keys = allowed.filter((key) => fields[key] !== undefined);
  if (keys.length === 0) return existing;

  const assignments = keys.map((key, i) => `${key} = $${i + 1}`);
  const values = keys.map((key) => fields[key]);
  const { rows } = await query(
    `
      UPDATE care_events
      SET ${assignments.join(', ')}
      WHERE id = $${keys.length + 1}
      RETURNING *
    `,
    [...values, id],
  );
  return rows[0] ?? null;
}

export async function deleteEvent(id, ownerId) {
  const existing = await getEventForOwner(id, ownerId);
  if (!existing) return null;
  const { rows } = await query('DELETE FROM care_events WHERE id = $1 RETURNING *', [id]);
  return rows[0] ?? null;
}

export async function quickWater(plantId, ownerId, overrides = {}) {
  const status = await getPlantWithStatus(plantId, ownerId);
  if (!status) return null;

  let amount_ml = overrides.amount_ml;
  if (amount_ml == null) {
    if (status.water_rain_covered || status.suggested_water_ml <= 0) {
      return {
        skipped: true,
        reason: 'rain_covered',
        usual_water_ml: status.usual_water_ml,
        rain_credit_ml: status.rain_credit_ml,
        rain_precip_mm: status.rain_precip_mm,
      };
    }
    amount_ml = status.suggested_water_ml;
  }

  return createEvent(plantId, ownerId, {
    type: 'water',
    amount_ml,
    occurred_at: overrides.occurred_at,
  });
}

export async function listRecentEventsForOwner(ownerId, { limit = 500 } = {}) {
  const { rows } = await query(
    `
      SELECT e.*, p.name AS plant_name
      FROM care_events e
      JOIN plants p ON p.id = e.plant_id
      WHERE p.owner_id = $1
      ORDER BY e.occurred_at DESC
      LIMIT $2
    `,
    [ownerId, limit],
  );
  return rows;
}

export async function getLastEventByType(plantId, type) {
  const { rows } = await query(
    `
      SELECT *
      FROM care_events
      WHERE plant_id = $1 AND type = $2
      ORDER BY occurred_at DESC
      LIMIT 1
    `,
    [plantId, type],
  );
  return rows[0] ?? null;
}
