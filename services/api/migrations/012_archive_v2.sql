ALTER TABLE items
    ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE items
    ADD COLUMN IF NOT EXISTS archived_source text;

CREATE TABLE IF NOT EXISTS classification_examples (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    raw_text text NOT NULL,
    label jsonb NOT NULL,
    source text NOT NULL DEFAULT 'correction',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classification_examples_user_idx
    ON classification_examples (user_id, created_at DESC);
