DROP VIEW IF EXISTS plant_status;

ALTER TABLE plants DROP CONSTRAINT IF EXISTS plants_coords_pair;
ALTER TABLE plants
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude;

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
