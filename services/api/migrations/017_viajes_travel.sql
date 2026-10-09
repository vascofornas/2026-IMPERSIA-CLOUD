ALTER TABLE items ADD COLUMN IF NOT EXISTS travel_role text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS travel_trip_id uuid REFERENCES items (id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS travel_place text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS travel_end date;

CREATE INDEX IF NOT EXISTS items_travel_trip ON items (travel_trip_id) WHERE travel_trip_id IS NOT NULL;
