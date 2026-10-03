CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    look text NOT NULL DEFAULT 'claro',
    alert_email boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_deliveries (
    item_id uuid NOT NULL REFERENCES items (id) ON DELETE CASCADE,
    occurrence_day date NOT NULL,
    channel text NOT NULL DEFAULT 'email',
    sent_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (item_id, occurrence_day, channel)
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
    repeats text,
    time_known boolean NOT NULL DEFAULT false,
    alert_minutes_before integer,
    agenda_type text,
    medical_for text,
    medical_name text,
    medical_place text,
    medical_notes text,
    family_kind text,
    family_for text,
    family_name text,
    family_place text,
    family_notes text,
    leisure_kind text,
    leisure_with text,
    leisure_name text,
    leisure_place text,
    leisure_notes text,
    reminder_kind text,
    reminder_place text,
    reminder_notes text,
    casa_kind text,
    casa_place text,
    casa_notes text,
    supply_kind text,
    status text NOT NULL DEFAULT 'open',
    privacy text NOT NULL DEFAULT 'private',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_exceptions (
    item_id uuid NOT NULL REFERENCES items (id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users (id),
    day date NOT NULL,
    kind text NOT NULL,
    title text,
    module text,
    axis text,
    item_kind text,
    starts_at timestamptz,
    time_known boolean,
    PRIMARY KEY (item_id, day)
);

CREATE TABLE IF NOT EXISTS google_links (
    user_id uuid PRIMARY KEY REFERENCES users (id),
    google_email text,
    refresh_token text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
