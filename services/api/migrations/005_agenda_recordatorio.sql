ALTER TABLE items ADD COLUMN IF NOT EXISTS reminder_kind text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS reminder_place text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS reminder_notes text;
