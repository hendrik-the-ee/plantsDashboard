CREATE TABLE plants (
  id                      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                    text NOT NULL,
  species                 text,
  location                text,
  acquired_on             date,
  planted_on              date,                -- baseline for harvest estimates
  is_edible               boolean NOT NULL DEFAULT false,
  days_to_maturity        integer,             -- seeded from crops.json, user editable
  watering_interval_days  integer NOT NULL DEFAULT 7 CHECK (watering_interval_days > 0),
  fertilize_interval_days integer CHECK (fertilize_interval_days > 0),
  container_size_liters   numeric(8,2),        -- current value; changes logged as repot events
  soil_type               text CHECK (soil_type IN
                            ('potting_mix','loam','sandy','clay','coco_coir','raised_bed','hydroponic','other')),
  light_level             text CHECK (light_level IN ('low','medium','bright','full_sun')),
  notes                   text,
  archived_at             timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_plants_active ON plants(id) WHERE archived_at IS NULL;

CREATE TABLE care_events (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plant_id    integer NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN
                ('water','fertilize','prune','repot','harvest','observation')),
  occurred_at timestamptz NOT NULL DEFAULT now(),      -- backdatable; zod enforces not-future
  amount_ml   numeric(8,1) CHECK (amount_ml > 0),      -- water events, canonical ml
  yield_amount numeric(8,2) CHECK (yield_amount > 0),  -- harvest events
  yield_unit   text CHECK (yield_unit IN ('g','kg','oz','lb','count')),
  container_size_liters          numeric(8,2),         -- repot events: new value
  previous_container_size_liters numeric(8,2),         -- repot events: value before
  soil_type                      text,                 -- repot events: new value
  previous_soil_type             text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_care_events_plant_time ON care_events(plant_id, occurred_at DESC);
CREATE INDEX idx_care_events_type ON care_events(plant_id, type, occurred_at DESC);

CREATE TABLE readings (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plant_id    integer NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  metric      text NOT NULL CHECK (metric IN
                ('soil_moisture','temperature','humidity','light','ph','height_cm','health_score')),
  value       double precision NOT NULL,
  unit        text,
  source      text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','analysis')),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  notes       text
);
CREATE INDEX idx_readings_plant_metric_time ON readings(plant_id, metric, recorded_at DESC);

-- single row; timezone is needed from Phase 2 for correct "due today"
CREATE TABLE settings (
  id         integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  timezone   text NOT NULL DEFAULT 'UTC',
  units      text NOT NULL DEFAULT 'metric' CHECK (units IN ('metric','imperial')),
  latitude   numeric(8,5),      -- used from Phase 6
  longitude  numeric(8,5),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO settings (id) VALUES (1);

CREATE VIEW plant_status AS
WITH last_water AS (
  SELECT DISTINCT ON (plant_id) plant_id, occurred_at, amount_ml
  FROM care_events
  WHERE type = 'water'
  ORDER BY plant_id, occurred_at DESC
)
SELECT p.*,
       lw.occurred_at AS last_watered_at,
       lw.amount_ml   AS last_amount_ml,     -- labels the one-tap button
       (lw.occurred_at + make_interval(days => p.watering_interval_days))::date AS next_water_due
FROM plants p
LEFT JOIN last_water lw ON lw.plant_id = p.id;
