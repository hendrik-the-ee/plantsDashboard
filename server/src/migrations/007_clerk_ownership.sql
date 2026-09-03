-- Multi-user ownership via Clerk user IDs.

DROP VIEW IF EXISTS plant_status;

ALTER TABLE plants ADD COLUMN owner_id text;

-- Existing single-user rows cannot be assigned automatically; clear them.
DELETE FROM care_events;
DELETE FROM readings;
DELETE FROM plants;

ALTER TABLE plants ALTER COLUMN owner_id SET NOT NULL;
CREATE INDEX idx_plants_owner ON plants(owner_id) WHERE archived_at IS NULL;

ALTER TABLE settings DROP CONSTRAINT settings_id_check;
ALTER TABLE settings ADD COLUMN owner_id text;
DELETE FROM settings;
ALTER TABLE settings DROP CONSTRAINT settings_pkey;
ALTER TABLE settings DROP COLUMN id;
ALTER TABLE settings ADD PRIMARY KEY (owner_id);

CREATE VIEW plant_status AS
WITH last_water AS (
  SELECT DISTINCT ON (plant_id) plant_id, occurred_at, amount_ml
  FROM care_events
  WHERE type = 'water'
  ORDER BY plant_id, occurred_at DESC
)
SELECT p.*,
       lw.occurred_at AS last_watered_at,
       lw.amount_ml   AS last_amount_ml,
       (lw.occurred_at + make_interval(days => p.watering_interval_days))::date AS next_water_due
FROM plants p
LEFT JOIN last_water lw ON lw.plant_id = p.id;
