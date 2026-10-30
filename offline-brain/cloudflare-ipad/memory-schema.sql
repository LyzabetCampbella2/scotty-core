CREATE TABLE IF NOT EXISTS brain_notes (
 id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, scope TEXT NOT NULL,
 title TEXT NOT NULL, content TEXT NOT NULL, url TEXT,
 reviewed_at TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS brain_notes_lookup ON brain_notes(scope, agent_id, reviewed_at);
CREATE TABLE IF NOT EXISTS brain_missions (
 id TEXT PRIMARY KEY, question TEXT NOT NULL, team_size INTEGER NOT NULL,
 status TEXT NOT NULL, result_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS brain_missions_recent ON brain_missions(updated_at);
CREATE TABLE IF NOT EXISTS brain_installation (
 id INTEGER PRIMARY KEY CHECK(id=1), lab_name TEXT NOT NULL, schema_version INTEGER NOT NULL);
INSERT OR IGNORE INTO brain_installation(id,lab_name,schema_version)
 VALUES(1,'scotty-independent-ipad-brain-lab',1);
