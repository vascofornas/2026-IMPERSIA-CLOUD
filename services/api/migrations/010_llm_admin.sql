CREATE TABLE IF NOT EXISTS llm_settings (
    id integer PRIMARY KEY CHECK (id = 1),
    enabled boolean NOT NULL DEFAULT false,
    provider text NOT NULL DEFAULT 'openrouter',
    model text NOT NULL DEFAULT 'openai/gpt-4o-mini',
    input_price_per_mtok numeric(12, 6) NOT NULL DEFAULT 0.15,
    output_price_per_mtok numeric(12, 6) NOT NULL DEFAULT 0.60,
    daily_budget_usd numeric(10, 4) NOT NULL DEFAULT 1.0000,
    monthly_budget_usd numeric(10, 4) NOT NULL DEFAULT 10.0000,
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO llm_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS llm_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users (id) ON DELETE SET NULL,
    capture_id uuid REFERENCES captures (id) ON DELETE SET NULL,
    provider text NOT NULL,
    model text NOT NULL,
    purpose text NOT NULL DEFAULT 'archive',
    input_tokens integer NOT NULL DEFAULT 0,
    output_tokens integer NOT NULL DEFAULT 0,
    cost_usd numeric(12, 8) NOT NULL DEFAULT 0,
    latency_ms integer,
    success boolean NOT NULL DEFAULT true,
    error_message text,
    fallback_used boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS llm_usage_created_at_idx ON llm_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS llm_usage_user_id_idx ON llm_usage (user_id);
