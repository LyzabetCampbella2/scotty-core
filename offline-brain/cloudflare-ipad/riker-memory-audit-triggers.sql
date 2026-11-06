-- Review-only isolated D1 migration: apply only after explicit owner approval.
-- These triggers make the audit part of the same SQLite statement as its mutation.
-- The existing application adapter must be updated before activation to avoid
-- duplicate audit entries. This migration is NOT automatically applied.
CREATE TRIGGER IF NOT EXISTS riker_memory_audit_on_insert
AFTER INSERT ON riker_memory
BEGIN
 INSERT INTO riker_memory_audit(id,note_id,action,at)
 VALUES(lower(hex(randomblob(16))),NEW.id,'proposed',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER IF NOT EXISTS riker_memory_audit_on_review
AFTER UPDATE OF status ON riker_memory
WHEN OLD.status='pending' AND NEW.status IN ('approved','rejected')
BEGIN
 INSERT INTO riker_memory_audit(id,note_id,action,at)
 VALUES(lower(hex(randomblob(16))),NEW.id,NEW.status,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
CREATE TRIGGER IF NOT EXISTS riker_memory_audit_on_delete
AFTER DELETE ON riker_memory
BEGIN
 INSERT INTO riker_memory_audit(id,note_id,action,at)
 VALUES(lower(hex(randomblob(16))),OLD.id,'deleted',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
