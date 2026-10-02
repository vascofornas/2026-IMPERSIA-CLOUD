CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    look text NOT NULL DEFAULT 'claro',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS captures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id),
    raw_text text NOT NULL,
    suggested_kind text NOT NULL,
    suggested_title text NOT NULL,
    suggested_starts_at timestamptz,
    source text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id),
    capture_id uuid REFERENCES captures (id),
    kind text NOT NULL,
    axis text NOT NULL DEFAULT 'personal',
    module text NOT NULL DEFAULT 'diario',
    title text NOT NULL,
    starts_at timestamptz,
    time_known boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'open',
    privacy text NOT NULL DEFAULT 'private',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS google_links (
    user_id uuid PRIMARY KEY REFERENCES users (id),
    google_email text,
    refresh_token text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
