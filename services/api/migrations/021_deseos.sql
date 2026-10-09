CREATE TABLE IF NOT EXISTS wish_lists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    sort_order integer NOT NULL DEFAULT 0,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wish_lists_name_per_user
    ON wish_lists (user_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS wish_lists_one_default
    ON wish_lists (user_id)
    WHERE is_default;

CREATE TABLE IF NOT EXISTS wish_details (
    item_id uuid PRIMARY KEY REFERENCES items (id) ON DELETE CASCADE,
    list_id uuid NOT NULL REFERENCES wish_lists (id),
    wish_kind text NOT NULL DEFAULT 'otro',
    reason text,
    place text,
    url text,
    estimated_price numeric(12, 2),
    currency text,
    priority text NOT NULL DEFAULT 'media',
    notes text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (wish_kind IN ('lugar', 'cosa', 'experiencia', 'otro')),
    CHECK (priority IN ('baja', 'media', 'alta')),
    CHECK (estimated_price IS NULL OR estimated_price >= 0),
    CHECK (currency IS NULL OR char_length(currency) = 3)
);

CREATE INDEX IF NOT EXISTS wish_details_list
    ON wish_details (list_id);

INSERT INTO wish_lists (user_id, name, description, is_default)
SELECT u.id, 'Mis deseos', 'Lista general para todo lo que todavía no tiene otra lista.', true
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM wish_lists wl
    WHERE wl.user_id = u.id AND wl.is_default
);

INSERT INTO wish_details (item_id, list_id, wish_kind)
SELECT i.id, wl.id, 'otro'
FROM items i
JOIN wish_lists wl ON wl.user_id = i.user_id AND wl.is_default
WHERE i.module = 'deseos'
  AND NOT EXISTS (
    SELECT 1 FROM wish_details wd WHERE wd.item_id = i.id
  );
