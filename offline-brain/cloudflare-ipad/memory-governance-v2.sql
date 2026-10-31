-- Optional migration for dedicated SCOTTY Cloudflare D1 only.
-- Apply manually after backup and release review; do NOT run on Render Postgres.
-- Audit records contain NO memory text, source URL, or discarded content.
CREATE TABLE IF NOT EXISTS brain_note_change_audit (
 id TEXT PRIMARY KEY,
 note_id TEXT NOT NULL,
 action TEXT NOT NULL,
 old_reviewed_at TEXT NOT NULL,
 new_reviewed_at TEXT,
 changed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS brain_note_change_audit_note ON brain_note_change_audit(note_id,changed_at);
