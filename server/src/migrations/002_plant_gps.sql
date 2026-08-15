-- Per-plant GPS replaces free-text location (room/spot names).
-- Recreate plant_status first: Postgres expands p.* when the view is created,
-- so DROP COLUMN location would otherwise fail on a view dependency.
DROP VIEW IF EXISTS plant_status;

ALTER TABLE plants
  ADD COLUMN latitude numeric(8,5)
    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  ADD COLUMN longitude numeric(8,5)
    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

ALTER TABLE plants
  ADD CONSTRAINT plants_coords_pair
  CHECK ((latitude IS NULL) = (longitude IS NULL));

ALTER TABLE plants DROP COLUMN location;

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
