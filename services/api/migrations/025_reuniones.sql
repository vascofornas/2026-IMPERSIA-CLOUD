CREATE TABLE IF NOT EXISTS meeting_details (
    item_id uuid PRIMARY KEY REFERENCES items (id) ON DELETE CASCADE,
    meeting_kind text NOT NULL DEFAULT 'cita',
    client_name text,
    project_id uuid REFERENCES items (id) ON DELETE SET NULL,
    participants text,
    place text,
    url text,
    outcome text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (meeting_kind IN ('cita', 'seguimiento')),
    CHECK (url IS NULL OR url ~* '^https?://')
);

CREATE INDEX IF NOT EXISTS meeting_details_project
    ON meeting_details (project_id)
    WHERE project_id IS NOT NULL;

INSERT INTO meeting_details (item_id, meeting_kind)
SELECT i.id, 'cita'
FROM items i
WHERE i.module = 'reuniones'
  AND NOT EXISTS (
      SELECT 1 FROM meeting_details md WHERE md.item_id = i.id
  );
