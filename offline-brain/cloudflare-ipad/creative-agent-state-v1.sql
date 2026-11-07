-- OPTIONAL, NOT APPLIED: isolated SCOTTY Creative Studio D1 persistence.
-- Staging lab only, after explicit backup/owner approval. Never Render/Neon.
-- No provider credentials, account tokens, private client media or production data.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS scotty_creative_runs_v1 (
 claim_id TEXT PRIMARY KEY,
 project_id TEXT NOT NULL,
 agent_id TEXT NOT NULL,
 mission_id TEXT NOT NULL,
 revision TEXT NOT NULL,
 idempotency_key TEXT NOT NULL UNIQUE,
 intent_digest TEXT NOT NULL CHECK(length(intent_digest)=64),
 status TEXT NOT NULL CHECK(status IN ('CLAIMED','AWAITING_CHIEF_REVIEW','FAILED_NO_RETRY')),
 result_text TEXT,
 evidence_ids_json TEXT NOT NULL DEFAULT '[]',
 review_chief_id TEXT,
 claimed_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 model_calls INTEGER NOT NULL DEFAULT 0 CHECK(model_calls BETWEEN 0 AND 1),
 UNIQUE(mission_id,revision,agent_id),
 CHECK(
   (status='CLAIMED' AND result_text IS NULL AND model_calls=0)
   OR (status='FAILED_NO_RETRY' AND model_calls BETWEEN 0 AND 1)
   OR (status='AWAITING_CHIEF_REVIEW' AND result_text IS NOT NULL AND model_calls=1)
 )
);
CREATE INDEX IF NOT EXISTS scotty_creative_runs_project_v1
 ON scotty_creative_runs_v1(project_id,agent_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS scotty_creative_run_audit_v1 (
 event_id TEXT PRIMARY KEY,
 claim_id TEXT NOT NULL,
 event_type TEXT NOT NULL CHECK(event_type IN ('claimed','completed','failed')),
 agent_id TEXT NOT NULL,
 mission_id TEXT NOT NULL,
 occurred_at TEXT NOT NULL,
 FOREIGN KEY(claim_id) REFERENCES scotty_creative_runs_v1(claim_id)
);
CREATE INDEX IF NOT EXISTS scotty_creative_audit_claim_v1
 ON scotty_creative_run_audit_v1(claim_id,occurred_at DESC);
-- Optional, PUBLIC/SYNTHETIC owner-reviewed notes only. There is no API to
-- write notes automatically from model outputs. Future private memory MUST use
-- a separately reviewed encrypted & permissioned design.
CREATE TABLE IF NOT EXISTS scotty_creative_memory_v1 (
 note_id TEXT PRIMARY KEY,
 project_id TEXT NOT NULL,
 owner_agent_id TEXT NOT NULL,
 department_id TEXT NOT NULL,
 scope TEXT NOT NULL CHECK(scope IN ('agent','department','project','shared-reviewed')),
 allowed_agent_ids_json TEXT NOT NULL,
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
 content_text TEXT NOT NULL CHECK(length(content_text) BETWEEN 1 AND 600),
 classification TEXT NOT NULL CHECK(classification='public-or-synthetic'),
 owner_reviewed INTEGER NOT NULL DEFAULT 0 CHECK(owner_reviewed IN (0,1)),
 review_state TEXT NOT NULL DEFAULT 'pending' CHECK(review_state IN ('pending','approved','revoked')),
 source_ref TEXT NOT NULL,
 expires_at TEXT,
 created_at TEXT NOT NULL,
 CHECK(review_state!='approved' OR owner_reviewed=1)
);
CREATE INDEX IF NOT EXISTS scotty_creative_memory_scope_v1
 ON scotty_creative_memory_v1(project_id,review_state,scope,expires_at);
