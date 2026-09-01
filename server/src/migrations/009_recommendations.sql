CREATE TABLE recommendation_dismissals (
  key          text NOT NULL,
  owner_id     text NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  snooze_until timestamptz,
  PRIMARY KEY (key, owner_id)
);
