-- OPTIONAL, UNAPPLIED D1 migration for synthetic/public Phase 1 profile-review records.
-- Source-only in GitHub development. Do not deploy without an isolated backup,
-- owner approval, an authenticated server identity integration and staging QA.
-- The approved row is NOT a runtime-active agent brain or an execution grant.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS scotty_phase1_agent_profile_heads_v1 (
 agent_id TEXT PRIMARY KEY,
 head_version INTEGER NOT NULL DEFAULT 0 CHECK(head_version>=0),
 approved_request_id TEXT,
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS scotty_phase1_agent_profile_reviews_v1 (
 request_id TEXT PRIMARY KEY,
 agent_id TEXT NOT NULL,
 owner_id TEXT NOT NULL,
 base_spec_version TEXT NOT NULL,
 expected_head_version INTEGER NOT NULL CHECK(expected_head_version>=0),
 idempotency_key TEXT NOT NULL UNIQUE,
 change_digest TEXT NOT NULL CHECK(length(change_digest)=64),
 patch_json TEXT NOT NULL CHECK(json_valid(patch_json)),
 scope TEXT NOT NULL CHECK(scope='agent.profile.review'),
 classification TEXT NOT NULL CHECK(classification='public-or-synthetic'),
 status TEXT NOT NULL DEFAULT 'pending'
   CHECK(status IN ('pending','approved','rejected','revoked')),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 decided_at TEXT,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 3),
 FOREIGN KEY(agent_id) REFERENCES scotty_phase1_agent_profile_heads_v1(agent_id),
 CHECK((status='pending' AND decided_at IS NULL AND version=1)
   OR(status IN ('approved','rejected') AND decided_at IS NOT NULL AND version=2)
   OR(status='revoked' AND decided_at IS NOT NULL AND version=3))
);
CREATE INDEX IF NOT EXISTS scotty_phase1_agent_profile_by_agent_v1
 ON scotty_phase1_agent_profile_reviews_v1(agent_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS scotty_phase1_agent_profile_audit_v1 (
 event_id TEXT PRIMARY KEY,
 request_id TEXT NOT NULL,
 actor_id TEXT NOT NULL,
 event_type TEXT NOT NULL CHECK(event_type IN ('created','approved','rejected','revoked')),
 previous_status TEXT,
 new_status TEXT NOT NULL CHECK(new_status IN ('pending','approved','rejected','revoked')),
 occurred_at TEXT NOT NULL,
 FOREIGN KEY(request_id) REFERENCES scotty_phase1_agent_profile_reviews_v1(request_id)
);
CREATE INDEX IF NOT EXISTS scotty_phase1_agent_profile_audit_by_request_v1
 ON scotty_phase1_agent_profile_audit_v1(request_id,occurred_at DESC);
CREATE TRIGGER IF NOT EXISTS scotty_phase1_profile_reject_deletes_v1
 BEFORE DELETE ON scotty_phase1_agent_profile_reviews_v1
 BEGIN SELECT RAISE(ABORT,'PROFILE_REVIEWS_APPEND_ONLY'); END;
CREATE TRIGGER IF NOT EXISTS scotty_phase1_profile_audit_no_update_v1
 BEFORE UPDATE ON scotty_phase1_agent_profile_audit_v1
 BEGIN SELECT RAISE(ABORT,'PROFILE_AUDIT_IMMUTABLE'); END;
CREATE TRIGGER IF NOT EXISTS scotty_phase1_profile_audit_no_delete_v1
 BEFORE DELETE ON scotty_phase1_agent_profile_audit_v1
 BEGIN SELECT RAISE(ABORT,'PROFILE_AUDIT_IMMUTABLE'); END;
CREATE TRIGGER IF NOT EXISTS scotty_phase1_profile_state_guard_v1
 BEFORE UPDATE ON scotty_phase1_agent_profile_reviews_v1
 BEGIN
  SELECT CASE WHEN NEW.request_id!=OLD.request_id
    OR NEW.agent_id!=OLD.agent_id
    OR NEW.owner_id!=OLD.owner_id
    OR NEW.base_spec_version!=OLD.base_spec_version
    OR NEW.expected_head_version!=OLD.expected_head_version
    OR NEW.idempotency_key!=OLD.idempotency_key
    OR NEW.change_digest!=OLD.change_digest
    OR NEW.patch_json!=OLD.patch_json
    OR NEW.scope!=OLD.scope
    OR NEW.classification!=OLD.classification
    OR NEW.created_at!=OLD.created_at
    OR NEW.expires_at!=OLD.expires_at
    OR NOT ((OLD.status='pending' AND NEW.status IN ('approved','rejected') AND NEW.version=2)
      OR (OLD.status='approved' AND NEW.status='revoked' AND NEW.version=3))
    THEN RAISE(ABORT,'PROFILE_REVIEW_STATE_INVALID') END;
  SELECT CASE WHEN NEW.status='approved' AND (
    (SELECT head_version FROM scotty_phase1_agent_profile_heads_v1
       WHERE agent_id=OLD.agent_id)!=OLD.expected_head_version
    OR (SELECT approved_request_id FROM scotty_phase1_agent_profile_heads_v1
       WHERE agent_id=OLD.agent_id) IS NOT NULL)
    THEN RAISE(ABORT,'PROFILE_HEAD_VERSION_CONFLICT') END;
  SELECT CASE WHEN NEW.status='revoked' AND (
    (SELECT approved_request_id FROM scotty_phase1_agent_profile_heads_v1
       WHERE agent_id=OLD.agent_id)!=OLD.request_id)
    THEN RAISE(ABORT,'PROFILE_REVOKE_NOT_CURRENT') END;
 END;
CREATE TRIGGER IF NOT EXISTS scotty_phase1_profile_head_transition_v1
 AFTER UPDATE OF status ON scotty_phase1_agent_profile_reviews_v1
 WHEN NEW.status IN ('approved','revoked')
 BEGIN
  UPDATE scotty_phase1_agent_profile_heads_v1
    SET head_version=head_version+1,
      approved_request_id=CASE WHEN NEW.status='approved' THEN NEW.request_id ELSE NULL END,
      updated_at=NEW.updated_at
   WHERE agent_id=NEW.agent_id;
 END;
