ALTER TABLE health_controls DROP CONSTRAINT IF EXISTS health_controls_kind_check;
ALTER TABLE health_controls ADD CONSTRAINT health_controls_kind_check
    CHECK (kind IN ('presion', 'glucosa', 'medicacion', 'peso', 'sueno'));
