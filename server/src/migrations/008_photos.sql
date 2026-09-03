CREATE TABLE plant_photos (
  id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plant_id   integer NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  file_path  text NOT NULL,
  bytes      integer,
  width      integer,
  height     integer,
  taken_at   timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_plant_photos_plant ON plant_photos(plant_id, taken_at DESC);

CREATE TABLE photo_analyses (
  id                   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  photo_id             integer NOT NULL REFERENCES plant_photos(id) ON DELETE CASCADE,
  status               text NOT NULL CHECK (status IN ('queued','running','done','failed')),
  model                text,
  health_score         double precision CHECK (health_score BETWEEN 0 AND 100),
  growth_stage         text,
  estimated_harvest_on date,
  raw                  jsonb,
  error                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  completed_at         timestamptz
);
CREATE INDEX idx_photo_analyses_photo ON photo_analyses(photo_id, created_at DESC);

CREATE TABLE analysis_findings (
  id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  analysis_id    integer NOT NULL REFERENCES photo_analyses(id) ON DELETE CASCADE,
  issue          text NOT NULL,
  severity       text NOT NULL CHECK (severity IN ('info','low','medium','high')),
  confidence     double precision CHECK (confidence BETWEEN 0 AND 1),
  recommendation text NOT NULL
);
