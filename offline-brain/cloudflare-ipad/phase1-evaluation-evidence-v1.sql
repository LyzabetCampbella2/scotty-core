-- OPTIONAL, UNAPPLIED SCOTTY Phase 1 evidence schema for isolated D1 only.
-- This records verification metadata, NEVER prompts, responses, private memory,
-- authentication secrets or executable permissions. Apply only after backup
-- and explicit owner approval. Requires phase1-profile-review-ledger-v1.sql.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS scotty_phase1_eval_sessions_v1 (
 session_id TEXT PRIMARY KEY,
 review_request_id TEXT NOT NULL,
 agent_id TEXT NOT NULL,
 owner_id TEXT NOT NULL,
 brain_spec_version TEXT NOT NULL,
 evaluation_plan_version TEXT NOT NULL,
 model_provider TEXT NOT NULL,
 model_name TEXT NOT NULL,
 provider_trace_ref TEXT NOT NULL,
 grader_id TEXT NOT NULL,
 evidence_origin TEXT NOT NULL CHECK(evidence_origin IN ('server-verified-model','synthetic-fixture')),
 owner_acceptance_ref TEXT,
 created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 FOREIGN KEY(review_request_id) REFERENCES scotty_phase1_agent_profile_reviews_v1(request_id)
);
CREATE INDEX IF NOT EXISTS scotty_phase1_eval_sessions_review_v1
 ON scotty_phase1_eval_sessions_v1(review_request_id,created_at DESC);
CREATE TABLE IF NOT EXISTS scotty_phase1_eval_case_results_v1 (
 case_id TEXT PRIMARY KEY,
 session_id TEXT NOT NULL,
 scenario_type TEXT NOT NULL CHECK(scenario_type IN ('COMMON','SPECIALTY','ADVERSARIAL')),
 scenario_ref TEXT NOT NULL,
 prompt_digest TEXT NOT NULL CHECK(length(prompt_digest)=64),
 response_digest TEXT NOT NULL CHECK(length(response_digest)=64),
 trace_ref TEXT NOT NULL,
 grader_ref TEXT NOT NULL,
 role_fit INTEGER NOT NULL CHECK(role_fit BETWEEN 0 AND 4),
 accuracy INTEGER NOT NULL CHECK(accuracy BETWEEN 0 AND 4),
 deliverable INTEGER NOT NULL CHECK(deliverable BETWEEN 0 AND 4),
 boundaries INTEGER NOT NULL CHECK(boundaries BETWEEN 0 AND 4),
 communication INTEGER NOT NULL CHECK(communication BETWEEN 0 AND 4),
 safety_violation INTEGER NOT NULL CHECK(safety_violation IN (0,1)),
 reviewed_at TEXT NOT NULL,
 FOREIGN KEY(session_id) REFERENCES scotty_phase1_eval_sessions_v1(session_id),
 UNIQUE(session_id,scenario_type)
);
CREATE INDEX IF NOT EXISTS scotty_phase1_eval_cases_session_v1
 ON scotty_phase1_eval_case_results_v1(session_id);
CREATE TRIGGER IF NOT EXISTS scotty_phase1_eval_sessions_immutable_update_v1
 BEFORE UPDATE ON scotty_phase1_eval_sessions_v1
 BEGIN SELECT RAISE(ABORT,'PHASE1_EVAL_EVIDENCE_IMMUTABLE'); END;
CREATE TRIGGER IF NOT EXISTS scotty_phase1_eval_sessions_immutable_delete_v1
 BEFORE DELETE ON scotty_phase1_eval_sessions_v1
 BEGIN SELECT RAISE(ABORT,'PHASE1_EVAL_EVIDENCE_IMMUTABLE'); END;
CREATE TRIGGER IF NOT EXISTS scotty_phase1_eval_cases_immutable_update_v1
 BEFORE UPDATE ON scotty_phase1_eval_case_results_v1
 BEGIN SELECT RAISE(ABORT,'PHASE1_EVAL_EVIDENCE_IMMUTABLE'); END;
CREATE TRIGGER IF NOT EXISTS scotty_phase1_eval_cases_immutable_delete_v1
 BEFORE DELETE ON scotty_phase1_eval_case_results_v1
 BEGIN SELECT RAISE(ABORT,'PHASE1_EVAL_EVIDENCE_IMMUTABLE'); END;
