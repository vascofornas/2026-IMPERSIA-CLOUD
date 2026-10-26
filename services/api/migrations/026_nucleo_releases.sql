-- Proyecto nuevo: lo que sueltas en Núcleo vive aquí, no en items/captures del OS legacy.

CREATE TABLE IF NOT EXISTS nucleo_releases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    raw_text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nucleo_releases_user_created_idx
    ON nucleo_releases (user_id, created_at DESC);
