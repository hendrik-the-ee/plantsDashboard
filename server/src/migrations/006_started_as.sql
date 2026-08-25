-- How the plant was established: seed vs seedling vs cutting matter for care timelines.
DROP VIEW IF EXISTS plant_status;

ALTER TABLE plants
  ADD COLUMN started_as text
    CHECK (started_as IS NULL OR started_as IN ('seed', 'seedling', 'cutting'));

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
