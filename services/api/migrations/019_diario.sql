ALTER TABLE users
    ADD COLUMN IF NOT EXISTS journal_ai_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS journal_entries (
    item_id uuid PRIMARY KEY REFERENCES items (id) ON DELETE CASCADE,
    content text NOT NULL,
    journal_kind text NOT NULL DEFAULT 'entrada',
    occurred_on date NOT NULL,
    mood smallint,
    energy smallint,
    guided_happened text,
    guided_grateful text,
    guided_need text,
    tags text[] NOT NULL DEFAULT '{}',
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (journal_kind IN ('entrada', 'animo', 'reflexion', 'gratitud')),
    CHECK (mood IS NULL OR mood BETWEEN 1 AND 5),
    CHECK (energy IS NULL OR energy BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS journal_entries_occurred_on
    ON journal_entries (occurred_on DESC);

CREATE INDEX IF NOT EXISTS journal_entries_tags
    ON journal_entries USING gin (tags);

CREATE TABLE IF NOT EXISTS journal_summaries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    period_type text NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    source_updated_at timestamptz NOT NULL,
    entry_count integer NOT NULL,
    mood_average numeric(3, 2),
    themes jsonb NOT NULL DEFAULT '[]'::jsonb,
    summary_text text NOT NULL,
    reflection_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
    model text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, period_type, period_start),
    CHECK (period_type IN ('week', 'month')),
    CHECK (entry_count > 0)
);

CREATE INDEX IF NOT EXISTS journal_summaries_user_period
    ON journal_summaries (user_id, period_start DESC);
