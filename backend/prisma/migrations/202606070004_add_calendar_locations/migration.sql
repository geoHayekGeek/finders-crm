-- Migration: add locations table and calendar_events.location_id

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_name_lower
  ON locations (LOWER(TRIM(name)));

CREATE INDEX IF NOT EXISTS idx_locations_is_active
  ON locations (is_active);

ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_location_id
  ON calendar_events(location_id);

INSERT INTO locations (name, description, is_active)
SELECT DISTINCT TRIM(location) AS name, NULL, TRUE
FROM calendar_events
WHERE location IS NOT NULL
  AND TRIM(location) <> ''
ON CONFLICT DO NOTHING;

UPDATE calendar_events ce
SET location_id = loc.id
FROM locations loc
WHERE ce.location_id IS NULL
  AND ce.location IS NOT NULL
  AND TRIM(ce.location) <> ''
  AND LOWER(TRIM(ce.location)) = LOWER(TRIM(loc.name));

ALTER TABLE locations
ALTER COLUMN is_active SET DEFAULT TRUE;

ALTER TABLE locations
ALTER COLUMN is_active SET NOT NULL;

CREATE OR REPLACE FUNCTION sync_calendar_event_location_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_id IS NOT NULL THEN
    SELECT name INTO NEW.location
    FROM locations
    WHERE id = NEW.location_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_calendar_event_location_name ON calendar_events;
CREATE TRIGGER trg_sync_calendar_event_location_name
  BEFORE INSERT OR UPDATE OF location_id ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION sync_calendar_event_location_name();

CREATE OR REPLACE FUNCTION sync_calendar_event_location_name_on_locations_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE calendar_events
    SET location = NEW.name
    WHERE location_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_calendar_event_location_name_on_locations_update ON locations;
CREATE TRIGGER trg_sync_calendar_event_location_name_on_locations_update
  AFTER UPDATE OF name ON locations
  FOR EACH ROW
  EXECUTE FUNCTION sync_calendar_event_location_name_on_locations_update();
