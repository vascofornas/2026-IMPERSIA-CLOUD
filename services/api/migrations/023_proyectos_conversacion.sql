ALTER TABLE project_details
    ADD COLUMN IF NOT EXISTS work_types text[] NOT NULL DEFAULT '{}'::text[];

UPDATE project_details
SET work_types = ARRAY[work_type]
WHERE work_type IS NOT NULL
  AND cardinality(work_types) = 0;
