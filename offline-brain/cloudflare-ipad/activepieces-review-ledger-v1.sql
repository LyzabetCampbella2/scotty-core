-- OPTIONAL ADDITIVE migration: isolated SCOTTY Cloudflare D1 brain lab only.
-- DO NOT apply to Render, Neon, production SCOTTY, or Activepieces Tables.
-- Not part of any automatically applied migration. Back up, review and
-- obtain explicit owner approval before executing this SQL on a real D1 DB.
-- Owner decisions here are RECORDS, not authority to execute AI or missions.
-- No prompt, private memory, project document, token or client content.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS scotty_activepieces_review_requests_v1 (
 request_id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL,
 project_id TEXT NOT NULL,
 mission_id TEXT NOT NULL,
 revision TEXT NOT NULL,
 intent_digest TEXT NOT NULL CHECK(length(intent_digest)=64),
 agent_ids_json TEXT NOT NULL,
 idempotency_key TEXT NOT NULL UNIQUE,
 scope TEXT NOT NULL CHECK(scope = 'mission.preview'),
 status TEXT NOT NULL DEFAULT 'pending'
  CHECK(status IN ('pending','approved','rejected','revoked')),
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 decided_at TEXT,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
 CHECK((status='pending' AND decided_at IS NULL)
    OR (status<>'pending' AND decided_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS scotty_ap_review_project_status_v1
 ON scotty_activepieces_review_requests_v1(project_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS scotty_ap_review_expiry_v1
 ON scotty_activepieces_review_requests_v1(status,expires_at);
CREATE TABLE IF NOT EXISTS scotty_activepieces_review_audit_v1 (
 event_id TEXT PRIMARY KEY,
 request_id TEXT NOT NULL,
 actor_id TEXT NOT NULL,
 actor_type TEXT NOT NULL CHECK(actor_type='authenticated-owner'),
 event_type TEXT NOT NULL CHECK(event_type IN ('created','approved','rejected','revoked')),
 previous_status TEXT,
 new_status TEXT NOT NULL CHECK(new_status IN ('pending','approved','rejected','revoked')),
 revision TEXT NOT NULL,
 intent_digest TEXT NOT NULL CHECK(length(intent_digest)=64),
 occurred_at TEXT NOT NULL,
 FOREIGN KEY(request_id) REFERENCES scotty_activepieces_review_requests_v1(request_id)
);
CREATE INDEX IF NOT EXISTS scotty_ap_review_audit_recent_v1
 ON scotty_activepieces_review_audit_v1(request_id,occurred_at DESC);
