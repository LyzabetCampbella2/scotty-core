-- TEST-ONLY SCHEMA: applied only to disposable GitHub CI database.
-- NEVER apply to production or shared staging databases.
-- The explicit database name is a hard stop against an accidental shared/production migration.
BEGIN;
DO $$
BEGIN
  IF current_database() <> 'scotty_phase5_synthetic_test' THEN
    RAISE EXCEPTION 'Refusing Phase 5 synthetic schema outside dedicated test database';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS scotty_p5_synthetic_grants (
  grant_id TEXT PRIMARY KEY CHECK (grant_id ~ '^SYN-GRANT-[A-Z0-9-]{1,100}$'),
  subject TEXT NOT NULL CHECK (subject = 'owner'),
  project_id TEXT NOT NULL CHECK (project_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  resource_project_id TEXT NOT NULL CHECK (resource_project_id = project_id),
  resource_id TEXT NOT NULL CHECK (resource_id ~ '^SYN-[A-Z0-9-]{1,100}$'),
  action TEXT NOT NULL CHECK (action IN ('workspace:read','knowledge:propose')),
  data_class TEXT NOT NULL CHECK (data_class = 'synthetic-only'),
  grant_version SMALLINT NOT NULL DEFAULT 1 CHECK (grant_version = 1),
  state TEXT NOT NULL CHECK (state IN ('synthetic-approved','synthetic-revoked')),
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  proof_digest TEXT NOT NULL CHECK (length(proof_digest) BETWEEN 1 AND 256),
  -- Optional Ed25519 synthetic proof fields; legacy mock fixtures remain intentionally unsigned.
  proof_issuer TEXT CHECK (proof_issuer IS NULL OR proof_issuer = 'scotty-p5-synthetic-owner'),
  proof_key_id TEXT CHECK (proof_key_id IS NULL OR proof_key_id ~ '^SYN-KEY-[A-Z0-9-]{1,100}
  -- Inert column: only for the row-lock privilege required by FOR SHARE.
  -- Runtime cannot change this to TRUE or update any authorization fields.
  lock_pad BOOLEAN NOT NULL DEFAULT FALSE CHECK (lock_pad = FALSE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scotty_p5_synthetic_nonce_claims (
  grant_id TEXT NOT NULL REFERENCES scotty_p5_synthetic_grants(grant_id) ON DELETE RESTRICT,
  nonce TEXT NOT NULL CHECK (nonce ~ '^SYN-NONCE-[A-Z0-9-]{6,80}$'),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (grant_id,nonce)
);

CREATE TABLE IF NOT EXISTS scotty_p5_synthetic_audit (
  event_id BIGSERIAL PRIMARY KEY,
  project_id TEXT NOT NULL CHECK (project_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  resource_id TEXT NOT NULL CHECK (resource_id ~ '^SYN-[A-Z0-9-]{1,100}$'),
  action TEXT NOT NULL CHECK (action IN ('workspace:read','knowledge:propose')),
  outcome TEXT NOT NULL CHECK (outcome IN ('SIMULATED_ELIGIBLE','DENY')),
  reason TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Separate append-only redacted denial ledger; no raw input, grant IDs or tokens.
CREATE TABLE IF NOT EXISTS scotty_p5_synthetic_denial_audit (
  event_id BIGSERIAL PRIMARY KEY,
  outcome TEXT NOT NULL DEFAULT 'DENY' CHECK (outcome = 'DENY'),
  reason_code TEXT NOT NULL CHECK (reason_code ~ '^[A-Z0-9_]{3,64}$'),
  action_category TEXT NOT NULL CHECK (action_category IN ('WORKSPACE_READ','KNOWLEDGE_PROPOSE','OTHER')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE scotty_p5_synthetic_grants FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_nonce_claims FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_audit FROM PUBLIC;
REVOKE ALL ON SEQUENCE scotty_p5_synthetic_audit_event_id_seq FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_denial_audit FROM PUBLIC;
REVOKE ALL ON SEQUENCE scotty_p5_synthetic_denial_audit_event_id_seq FROM PUBLIC;
COMMENT ON TABLE scotty_p5_synthetic_grants IS 'Disposable synthetic Phase 5 fixtures only; NOT real owner consent.';
COMMIT;
),
  proof_signature TEXT CHECK (proof_signature IS NULL OR proof_signature ~ '^[A-Za-z0-9_-]{86}
  -- Inert column: only for the row-lock privilege required by FOR SHARE.
  -- Runtime cannot change this to TRUE or update any authorization fields.
  lock_pad BOOLEAN NOT NULL DEFAULT FALSE CHECK (lock_pad = FALSE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scotty_p5_synthetic_nonce_claims (
  grant_id TEXT NOT NULL REFERENCES scotty_p5_synthetic_grants(grant_id) ON DELETE RESTRICT,
  nonce TEXT NOT NULL CHECK (nonce ~ '^SYN-NONCE-[A-Z0-9-]{6,80}$'),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (grant_id,nonce)
);

CREATE TABLE IF NOT EXISTS scotty_p5_synthetic_audit (
  event_id BIGSERIAL PRIMARY KEY,
  project_id TEXT NOT NULL CHECK (project_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  resource_id TEXT NOT NULL CHECK (resource_id ~ '^SYN-[A-Z0-9-]{1,100}$'),
  action TEXT NOT NULL CHECK (action IN ('workspace:read','knowledge:propose')),
  outcome TEXT NOT NULL CHECK (outcome IN ('SIMULATED_ELIGIBLE','DENY')),
  reason TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Separate append-only redacted denial ledger; no raw input, grant IDs or tokens.
CREATE TABLE IF NOT EXISTS scotty_p5_synthetic_denial_audit (
  event_id BIGSERIAL PRIMARY KEY,
  outcome TEXT NOT NULL DEFAULT 'DENY' CHECK (outcome = 'DENY'),
  reason_code TEXT NOT NULL CHECK (reason_code ~ '^[A-Z0-9_]{3,64}$'),
  action_category TEXT NOT NULL CHECK (action_category IN ('WORKSPACE_READ','KNOWLEDGE_PROPOSE','OTHER')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE scotty_p5_synthetic_grants FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_nonce_claims FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_audit FROM PUBLIC;
REVOKE ALL ON SEQUENCE scotty_p5_synthetic_audit_event_id_seq FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_denial_audit FROM PUBLIC;
REVOKE ALL ON SEQUENCE scotty_p5_synthetic_denial_audit_event_id_seq FROM PUBLIC;
COMMENT ON TABLE scotty_p5_synthetic_grants IS 'Disposable synthetic Phase 5 fixtures only; NOT real owner consent.';
COMMIT;
),
  -- Inert column: only for the row-lock privilege required by FOR SHARE.
  -- Runtime cannot change this to TRUE or update any authorization fields.
  lock_pad BOOLEAN NOT NULL DEFAULT FALSE CHECK (lock_pad = FALSE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scotty_p5_synthetic_nonce_claims (
  grant_id TEXT NOT NULL REFERENCES scotty_p5_synthetic_grants(grant_id) ON DELETE RESTRICT,
  nonce TEXT NOT NULL CHECK (nonce ~ '^SYN-NONCE-[A-Z0-9-]{6,80}$'),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (grant_id,nonce)
);

CREATE TABLE IF NOT EXISTS scotty_p5_synthetic_audit (
  event_id BIGSERIAL PRIMARY KEY,
  project_id TEXT NOT NULL CHECK (project_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  resource_id TEXT NOT NULL CHECK (resource_id ~ '^SYN-[A-Z0-9-]{1,100}$'),
  action TEXT NOT NULL CHECK (action IN ('workspace:read','knowledge:propose')),
  outcome TEXT NOT NULL CHECK (outcome IN ('SIMULATED_ELIGIBLE','DENY')),
  reason TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Separate append-only redacted denial ledger; no raw input, grant IDs or tokens.
CREATE TABLE IF NOT EXISTS scotty_p5_synthetic_denial_audit (
  event_id BIGSERIAL PRIMARY KEY,
  outcome TEXT NOT NULL DEFAULT 'DENY' CHECK (outcome = 'DENY'),
  reason_code TEXT NOT NULL CHECK (reason_code ~ '^[A-Z0-9_]{3,64}$'),
  action_category TEXT NOT NULL CHECK (action_category IN ('WORKSPACE_READ','KNOWLEDGE_PROPOSE','OTHER')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE scotty_p5_synthetic_grants FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_nonce_claims FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_audit FROM PUBLIC;
REVOKE ALL ON SEQUENCE scotty_p5_synthetic_audit_event_id_seq FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_denial_audit FROM PUBLIC;
REVOKE ALL ON SEQUENCE scotty_p5_synthetic_denial_audit_event_id_seq FROM PUBLIC;
COMMENT ON TABLE scotty_p5_synthetic_grants IS 'Disposable synthetic Phase 5 fixtures only; NOT real owner consent.';
COMMIT;
