CREATE TABLE IF NOT EXISTS events (
    id bigserial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    action text NOT NULL,
    category text NOT NULL DEFAULT 'general',
    product text NOT NULL,
    screen text,
    user_id uuid REFERENCES users (id) ON DELETE SET NULL,
    email text,
    session_id text,
    ip inet,
    country text,
    city text,
    os text,
    browser text,
    device_type text,
    user_agent text,
    app_version text,
    success boolean NOT NULL DEFAULT true,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS events_created_at_idx ON events (created_at DESC);
CREATE INDEX IF NOT EXISTS events_action_idx ON events (action);
CREATE INDEX IF NOT EXISTS events_product_idx ON events (product);
CREATE INDEX IF NOT EXISTS events_user_id_idx ON events (user_id);
CREATE INDEX IF NOT EXISTS events_email_idx ON events (email);
CREATE INDEX IF NOT EXISTS events_category_idx ON events (category);
CREATE INDEX IF NOT EXISTS events_meta_gin ON events USING gin (meta);
