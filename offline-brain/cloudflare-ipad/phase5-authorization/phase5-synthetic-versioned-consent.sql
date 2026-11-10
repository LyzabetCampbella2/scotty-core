-- Phase 5 disposable-only, versioned departmental/shared consent store.
-- NO real owner approvals, agents, memory, authentication, or live migrations.
BEGIN;
DO $$
BEGIN
 IF current_database() <> 'scotty_phase5_synthetic_test' THEN
  RAISE EXCEPTION 'Refusing synthetic consent storage outside disposable test DB';
 END IF;
END $$;

CREATE TABLE scotty_p5_synthetic_consent_versions (
 grant_id TEXT NOT NULL CHECK (grant_id ~ '^SYN-CONSENT-[A-Z0-9-]{3,100}$'),
 revision INTEGER NOT NULL CHECK (revision BETWEEN 1 AND 100000),
 issuer TEXT NOT NULL CHECK (issuer = 'scotty-p5-synthetic-owner-consent'),
 key_id TEXT NOT NULL CHECK (key_id ~ '^SYN-CONSENT-KEY-[A-Z0-9-]{1,80}$'),
 actor_id TEXT NOT NULL CHECK (actor_id ~ '^(agent|chief)-[a-z0-9-]+$'),
 memory_owner_id TEXT NOT NULL CHECK (memory_owner_id ~ '^(agent|chief)-[a-z0-9-]+$'),
 project_id TEXT NOT NULL CHECK (project_id ~ '^SYN-PROJECT-[A-Z0-9-]{1,80}$'),
 scope TEXT NOT NULL CHECK (scope IN ('departmental','shared')),
 resource_id TEXT NOT NULL CHECK (resource_id ~ '^SYN-MEM-[A-Z0-9-]{1,100}$'),
 issued_at BIGINT NOT NULL,
 expires_at BIGINT NOT NULL CHECK (expires_at > issued_at AND expires_at - issued_at <= 86400000),
 status TEXT NOT NULL CHECK (status = 'synthetic-approved-review'),
 signature TEXT NOT NULL CHECK (signature ~ '^[A-Za-z0-9_-]{86}$'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(grant_id,revision)
);

CREATE TABLE scotty_p5_synthetic_consent_state (
 grant_id TEXT PRIMARY KEY,
 current_revision INTEGER NOT NULL,
 state_version BIGINT NOT NULL DEFAULT 1 CHECK (state_version > 0),
 revoked BOOLEAN NOT NULL DEFAULT TRUE,
 lock_pad BOOLEAN NOT NULL DEFAULT FALSE CHECK (lock_pad=FALSE),
 changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 FOREIGN KEY(grant_id,current_revision)
  REFERENCES scotty_p5_synthetic_consent_versions(grant_id,revision)
);

CREATE TABLE scotty_p5_synthetic_consent_lifecycle_events (
 event_id BIGSERIAL PRIMARY KEY,
 grant_id TEXT NOT NULL,
 revision INTEGER NOT NULL,
 state_version BIGINT NOT NULL,
 event_code TEXT NOT NULL CHECK (event_code IN (
  'REGISTERED_STOPPED','ACTIVATED_NEW_REVISION','ROTATED_REVISION',
  'REVOKED','ROTATED_STOPPED'
 )),
 observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(grant_id,state_version)
);

CREATE TABLE scotty_p5_synthetic_consent_review_events (
 event_id BIGSERIAL PRIMARY KEY,
 outcome TEXT NOT NULL CHECK (outcome IN ('DENY','SIMULATED_ELIGIBLE')),
 reason_code TEXT NOT NULL CHECK (reason_code IN (
  'CONSENT_NOT_VERIFIED','CONSENT_REVOKED_OR_MISSING','SYNTHETIC_CONSENT_REVIEW_OK'
 )),
 state_version BIGINT CHECK (state_version IS NULL OR state_version>0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE FUNCTION public.scotty_p5_consent_forbid_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 RAISE EXCEPTION 'Synthetic consent history is immutable';
END $$;

CREATE TRIGGER scotty_p5_consent_versions_append_only
 BEFORE UPDATE OR DELETE ON scotty_p5_synthetic_consent_versions
 FOR EACH ROW EXECUTE FUNCTION public.scotty_p5_consent_forbid_mutation();
CREATE TRIGGER scotty_p5_consent_lifecycle_append_only
 BEFORE UPDATE OR DELETE ON scotty_p5_synthetic_consent_lifecycle_events
 FOR EACH ROW EXECUTE FUNCTION public.scotty_p5_consent_forbid_mutation();
CREATE TRIGGER scotty_p5_consent_reviews_append_only
 BEFORE UPDATE OR DELETE ON scotty_p5_synthetic_consent_review_events
 FOR EACH ROW EXECUTE FUNCTION public.scotty_p5_consent_forbid_mutation();

CREATE FUNCTION public.scotty_p5_consent_state_transition()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE event_code TEXT;
BEGIN
 IF TG_OP = 'INSERT' THEN
  IF NEW.revoked IS NOT TRUE OR NEW.state_version <> 1 OR NEW.current_revision <> 1 THEN
   RAISE EXCEPTION 'Synthetic consent must register revoked at revision one';
  END IF;
  event_code := 'REGISTERED_STOPPED';
 ELSE
  IF NEW.grant_id <> OLD.grant_id OR NEW.state_version <> OLD.state_version+1
    OR NEW.lock_pad IS DISTINCT FROM FALSE
    OR NEW.current_revision < OLD.current_revision
    OR NEW.current_revision > OLD.current_revision+1
    OR (OLD.revoked AND NOT NEW.revoked AND NEW.current_revision = OLD.current_revision)
    OR (NEW.revoked=OLD.revoked AND NEW.current_revision=OLD.current_revision) THEN
   RAISE EXCEPTION 'Invalid consent version transition or revoked revision reuse';
  END IF;
  IF NEW.current_revision > OLD.current_revision THEN
   IF NEW.revoked THEN event_code := 'ROTATED_STOPPED';
   ELSIF OLD.revoked THEN event_code := 'ACTIVATED_NEW_REVISION';
   ELSE event_code := 'ROTATED_REVISION';
   END IF;
  ELSE
   IF NEW.revoked IS NOT TRUE THEN
    RAISE EXCEPTION 'Same revision only supports revocation';
   END IF;
   event_code := 'REVOKED';
  END IF;
 END IF;
 INSERT INTO public.scotty_p5_synthetic_consent_lifecycle_events
  (grant_id,revision,state_version,event_code)
 VALUES (NEW.grant_id,NEW.current_revision,NEW.state_version,event_code);
 RETURN NEW;
END $$;

CREATE TRIGGER scotty_p5_consent_state_audit
 BEFORE INSERT OR UPDATE ON scotty_p5_synthetic_consent_state
 FOR EACH ROW EXECUTE FUNCTION public.scotty_p5_consent_state_transition();

REVOKE ALL ON TABLE scotty_p5_synthetic_consent_versions FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_consent_state FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_consent_lifecycle_events FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_consent_review_events FROM PUBLIC;
REVOKE ALL ON SEQUENCE scotty_p5_synthetic_consent_lifecycle_events_event_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE scotty_p5_synthetic_consent_review_events_event_id_seq FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scotty_p5_consent_forbid_mutation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scotty_p5_consent_state_transition() FROM PUBLIC;

COMMENT ON TABLE scotty_p5_synthetic_consent_versions IS
 'Fictional immutable signed consent revisions; never real owner permission.';
COMMIT;
