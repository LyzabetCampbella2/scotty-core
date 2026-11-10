-- DRAFT MIGRATION ONLY. DO NOT EXECUTE on production or Activepieces tables.
-- Requires isolated staging Postgres, independently reviewed credentials/identity,
-- explicit migration approval, tested backups and restoration.
-- Existing scotty_projects and scotty_agents must already exist in staging.
BEGIN;
CREATE TABLE IF NOT EXISTS scotty_p5_tasks(
 id text PRIMARY KEY,
 project_id text NOT NULL REFERENCES scotty_projects(id) ON DELETE RESTRICT,
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
 agent_id text REFERENCES scotty_agents(id) ON DELETE RESTRICT,
 chief_id text NOT NULL REFERENCES scotty_agents(id) ON DELETE RESTRICT,
 state text NOT NULL DEFAULT 'proposed' CHECK(state IN ('proposed','approved','assigned','in_review','needs_revision','accepted','closed','revoked')),
 version integer NOT NULL CHECK(version>=1),
 approval_ref text,
 created_at timestamptz NOT NULL DEFAULT NOW(),
 updated_at timestamptz NOT NULL DEFAULT NOW(),
 UNIQUE(id,project_id)
);
CREATE TABLE IF NOT EXISTS scotty_p5_task_events(
 seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 task_id text NOT NULL,project_id text NOT NULL,
 version integer NOT NULL CHECK(version>=1),
 event_type text NOT NULL,actor_id text NOT NULL,actor_role text NOT NULL,
 from_state text,to_state text NOT NULL,
 agent_id text,approval_ref text,occurred_at timestamptz NOT NULL,
 FOREIGN KEY(task_id,project_id) REFERENCES scotty_p5_tasks(id,project_id) ON DELETE RESTRICT,
 UNIQUE(task_id,version)
);
CREATE INDEX IF NOT EXISTS scotty_p5_project_idx ON scotty_p5_tasks(project_id,state,updated_at DESC);
CREATE INDEX IF NOT EXISTS scotty_p5_agent_idx ON scotty_p5_tasks(project_id,agent_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS scotty_p5_event_project_idx ON scotty_p5_task_events(project_id,task_id,seq);
-- No runtime grants or RLS tenant policies are installed by this review-only draft.
-- No actual migration has been applied.
COMMIT;
