-- Disposable-only memory request audit. NEVER apply to production/shared staging.
BEGIN;
DO $$
BEGIN
 IF current_database() <> 'scotty_phase5_synthetic_test' THEN
  RAISE EXCEPTION 'Refusing synthetic memory audit outside disposable test database';
 END IF;
END;
$$;
CREATE TABLE scotty_p5_synthetic_memory_request_audit (
 event_id BIGSERIAL PRIMARY KEY,
 outcome TEXT NOT NULL CHECK (outcome IN ('DENY','SIMULATED_MEMORY_METADATA')),
 reason_code TEXT NOT NULL CHECK (reason_code IN (
  'PHASE5_MEMORY_IDENTITY_DISABLED','SYNTHETIC_AGENT_IDENTITY_REJECTED',
  'SYNTHETIC_MEMORY_STOPPED','SYNTHETIC_MEMORY_STOP_MISSING',
  'SYNTHETIC_MEMORY_UNEXPECTED_RESPONSE','SYNTHETIC_MEMORY_BACKEND_FAILURE',
  'SYNTHETIC_MEMORY_PREVIEW_OK'
 )),
 stop_version BIGINT CHECK (stop_version IS NULL OR stop_version>0),
 recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE scotty_p5_synthetic_memory_request_audit FROM PUBLIC;
REVOKE ALL ON SEQUENCE scotty_p5_synthetic_memory_request_audit_event_id_seq FROM PUBLIC;
COMMENT ON TABLE scotty_p5_synthetic_memory_request_audit IS
 'Synthetic access decisions only: no agent, project, token, memory identifier or real content.';
COMMIT;
