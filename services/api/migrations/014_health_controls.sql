CREATE TABLE IF NOT EXISTS health_controls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    capture_id uuid REFERENCES captures (id) ON DELETE SET NULL,
    kind text NOT NULL,
    title text NOT NULL,
    repeats text NOT NULL DEFAULT 'daily',
    reminder_time time NOT NULL DEFAULT '08:00',
    alert_minutes_before integer,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT health_controls_kind_check CHECK (kind IN ('presion', 'glucosa', 'medicacion', 'peso')),
    CONSTRAINT health_controls_status_check CHECK (status IN ('active', 'paused'))
);

CREATE INDEX IF NOT EXISTS health_controls_user_active
    ON health_controls (user_id)
    WHERE status = 'active';

ALTER TABLE items ADD COLUMN IF NOT EXISTS health_control_id uuid REFERENCES health_controls (id) ON DELETE SET NULL;
