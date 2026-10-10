ALTER TABLE project_details
    ADD COLUMN IF NOT EXISTS workflow_status text,
    ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS role_data jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE project_details pd
SET workflow_status = CASE
    WHEN pd.project_role = 'project' THEN CASE WHEN i.status = 'done' THEN 'done' ELSE 'active' END
    WHEN pd.project_role = 'task' THEN CASE WHEN i.status = 'done' THEN 'done' ELSE 'pending' END
    WHEN pd.project_role = 'milestone' THEN CASE WHEN i.status = 'done' THEN 'reached' ELSE 'upcoming' END
    WHEN pd.project_role = 'deliverable' THEN CASE WHEN i.status = 'done' THEN 'released' ELSE 'draft' END
    WHEN pd.project_role = 'note' THEN CASE WHEN i.status = 'done' THEN 'archived' ELSE 'active' END
    ELSE 'pending'
END
FROM items i
WHERE i.id = pd.item_id
  AND pd.workflow_status IS NULL;

ALTER TABLE project_details
    ALTER COLUMN workflow_status SET NOT NULL,
    ALTER COLUMN workflow_status SET DEFAULT 'pending';

ALTER TABLE project_details
    DROP CONSTRAINT IF EXISTS project_details_workflow_status_check;

ALTER TABLE project_details
    ADD CONSTRAINT project_details_workflow_status_check CHECK (
        workflow_status IN (
            'pending', 'in_progress', 'review', 'blocked', 'done',
            'upcoming', 'at_risk', 'reached',
            'draft', 'ready', 'released',
            'active', 'archived'
        )
    );

CREATE TABLE IF NOT EXISTS project_relations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES items (id) ON DELETE CASCADE,
    from_item_id uuid NOT NULL REFERENCES items (id) ON DELETE CASCADE,
    to_item_id uuid NOT NULL REFERENCES items (id) ON DELETE CASCADE,
    relation_type text NOT NULL CHECK (
        relation_type IN (
            'depends_on',
            'supports_milestone',
            'supports_deliverable',
            'documents',
            'relates_to'
        )
    ),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (from_item_id <> to_item_id),
    UNIQUE (from_item_id, to_item_id, relation_type)
);

CREATE INDEX IF NOT EXISTS project_relations_project
    ON project_relations (project_id);

CREATE INDEX IF NOT EXISTS project_relations_from
    ON project_relations (from_item_id);

CREATE INDEX IF NOT EXISTS project_relations_to
    ON project_relations (to_item_id);
