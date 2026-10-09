ALTER TABLE journal_entries
    ADD COLUMN IF NOT EXISTS guided_feeling text;

CREATE TABLE IF NOT EXISTS journal_summary_dismissals (
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    period_type text NOT NULL,
    period_start date NOT NULL,
    dismissed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, period_type, period_start),
    CHECK (period_type IN ('week', 'month'))
);
