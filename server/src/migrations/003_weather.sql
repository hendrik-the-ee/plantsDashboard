CREATE TABLE weather_cache (
  location_key text PRIMARY KEY,
  fetched_at   timestamptz NOT NULL,
  payload      jsonb NOT NULL
);
