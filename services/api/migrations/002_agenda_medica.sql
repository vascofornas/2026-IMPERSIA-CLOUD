ALTER TABLE items ADD COLUMN IF NOT EXISTS agenda_type text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS medical_for text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS medical_name text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS medical_place text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS medical_notes text;
