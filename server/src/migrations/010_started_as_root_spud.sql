-- Allow starting plants from roots/spuds (e.g. potatoes).
ALTER TABLE plants DROP CONSTRAINT IF EXISTS plants_started_as_check;
ALTER TABLE plants
  ADD CONSTRAINT plants_started_as_check
  CHECK (started_as IS NULL OR started_as IN ('seed', 'seedling', 'cutting', 'root_spud'));
