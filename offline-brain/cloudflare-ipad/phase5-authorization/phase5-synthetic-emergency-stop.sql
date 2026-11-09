-- DISPOSABLE TEST ONLY; never run against SCOTTY production or shared staging.
BEGIN;
DO $$
BEGIN
 IF current_database() <> 'scotty_phase5_synthetic_test' THEN
  RAISE EXCEPTION 'Refusing synthetic emergency stop outside disposable test database';
 END IF;
END;
$$;

CREATE TABLE scotty_p5_synthetic_emergency_stop (
 scope TEXT PRIMARY KEY CHECK (scope = 'synthetic'),
 stopped BOOLEAN NOT NULL DEFAULT TRUE,
 version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
 lock_pad BOOLEAN NOT NULL DEFAULT FALSE CHECK (lock_pad = FALSE),
 changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO scotty_p5_synthetic_emergency_stop(scope,stopped)
 VALUES ('synthetic',TRUE);

REVOKE ALL ON TABLE scotty_p5_synthetic_emergency_stop FROM PUBLIC;
COMMENT ON TABLE scotty_p5_synthetic_emergency_stop IS
 'Synthetic fail-closed kill switch in temporary CI DB; stopped by default; not a live SCOTTY control.';
COMMIT;
