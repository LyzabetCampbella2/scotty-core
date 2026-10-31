-- Optional additive migration for the isolated scotty-brain-memory D1 database.
-- Review backup and database binding BEFORE applying. Not part of memory-schema.sql.
-- Stores only redacted operational metadata; no question, model output, document or token.
CREATE TABLE IF NOT EXISTS brain_mission_recovery_audit (
 event_id TEXT PRIMARY KEY,
 mission_id TEXT NOT NULL,
 event_type TEXT NOT NULL CHECK(event_type='owner-stale-close'),
 previous_status TEXT NOT NULL CHECK(previous_status='running'),
 new_status TEXT NOT NULL CHECK(new_status='incomplete'),
 expected_updated_at TEXT NOT NULL,
 completed_at TEXT NOT NULL,
 preserved_stage_count INTEGER NOT NULL CHECK(preserved_stage_count >= 0),
 actor_type TEXT NOT NULL CHECK(actor_type='authenticated-owner')
);
CREATE INDEX IF NOT EXISTS brain_recovery_audit_by_mission
 ON brain_mission_recovery_audit(mission_id,completed_at DESC);
CREATE INDEX IF NOT EXISTS brain_recovery_audit_recent
 ON brain_mission_recovery_audit(completed_at DESC);
