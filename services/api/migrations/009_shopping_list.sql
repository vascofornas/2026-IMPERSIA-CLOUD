CREATE TABLE IF NOT EXISTS shopping_lists (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id),
    store_name text,
    store_lat double precision,
    store_lng double precision,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS shopping_lists_one_active
    ON shopping_lists (user_id)
    WHERE status = 'active';

ALTER TABLE items ADD COLUMN IF NOT EXISTS shopping_list_id uuid REFERENCES shopping_lists (id);

INSERT INTO shopping_lists (user_id, status)
SELECT DISTINCT i.user_id, 'active'
FROM items i
WHERE i.casa_kind = 'compra'
  AND i.status = 'open'
  AND NOT EXISTS (
    SELECT 1 FROM shopping_lists sl
    WHERE sl.user_id = i.user_id AND sl.status = 'active'
  );

UPDATE items i
SET shopping_list_id = sl.id
FROM shopping_lists sl
WHERE i.user_id = sl.user_id
  AND sl.status = 'active'
  AND i.casa_kind = 'compra'
  AND i.shopping_list_id IS NULL;
