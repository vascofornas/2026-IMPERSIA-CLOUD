ALTER TABLE suelta_notes
    ADD COLUMN IF NOT EXISTS returns_at timestamptz;

CREATE INDEX IF NOT EXISTS suelta_notes_user_returns_idx
    ON suelta_notes (user_id, returns_at);
