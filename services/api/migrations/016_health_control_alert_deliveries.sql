CREATE TABLE IF NOT EXISTS health_control_alert_deliveries (
    health_control_id uuid NOT NULL REFERENCES health_controls (id) ON DELETE CASCADE,
    occurrence_day date NOT NULL,
    channel text NOT NULL DEFAULT 'email',
    sent_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (health_control_id, occurrence_day, channel)
);

UPDATE health_controls SET alert_minutes_before = 0 WHERE alert_minutes_before IS NULL;
