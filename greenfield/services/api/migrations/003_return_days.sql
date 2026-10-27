ALTER TABLE suelta_notes
    ADD COLUMN IF NOT EXISTS return_days date[];

UPDATE suelta_notes
SET return_days = ARRAY[(returns_at AT TIME ZONE 'Europe/Madrid')::date]
WHERE returns_at IS NOT NULL
  AND (return_days IS NULL OR return_days = '{}');
