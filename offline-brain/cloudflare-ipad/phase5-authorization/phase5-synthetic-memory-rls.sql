-- Synthetic agent-memory row-level isolation. DISPOSABLE CI DATABASE ONLY.
-- No real SCOTTY memories, accounts, secrets, or actual permission grants.
BEGIN;
DO $$
BEGIN
 IF current_database() <> 'scotty_phase5_synthetic_test' THEN
  RAISE EXCEPTION 'Refusing Phase 5 memory RLS outside disposable test database';
 END IF;
END;
$$;

CREATE TABLE scotty_p5_synthetic_memory_identity_acl (
 login_name TEXT NOT NULL CHECK (login_name LIKE 'scotty_p5_agent_%'),
 project_id TEXT NOT NULL CHECK (project_id IN ('synthetic','SYN-PROJECT-OTHER')),
 agent_id TEXT NOT NULL CHECK (agent_id IN ('agent-creative-pulse','agent-creative-iris')),
 active BOOLEAN NOT NULL DEFAULT FALSE,
 PRIMARY KEY (login_name,project_id,agent_id)
);

CREATE TABLE scotty_p5_synthetic_memory_items (
 memory_id TEXT PRIMARY KEY CHECK (left(memory_id,8) = 'SYN-MEM-'),
 project_id TEXT NOT NULL CHECK (project_id IN ('synthetic','SYN-PROJECT-OTHER')),
 owner_agent_id TEXT NOT NULL CHECK (owner_agent_id IN ('agent-creative-pulse','agent-creative-iris')),
 memory_scope TEXT NOT NULL CHECK (memory_scope = 'individual'),
 data_class TEXT NOT NULL CHECK (data_class = 'synthetic-only'),
 payload TEXT NOT NULL CHECK (left(payload,4) = 'SYN-')
);

-- The independent database login identity, not client-provided headers, session
-- settings, owner agent IDs or application claims, determines the RLS principal.
-- SECURITY DEFINER is needed because runtime principals cannot read the ACL.
-- Production must use different trusted identity-to-DB mappings and backend auth.
CREATE FUNCTION public.scotty_p5_synthetic_memory_allows(p_project TEXT,p_agent TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.scotty_p5_synthetic_memory_identity_acl AS acl
  WHERE acl.login_name = session_user::text
    AND acl.project_id = p_project
    AND acl.agent_id = p_agent
    AND acl.active IS TRUE
 );
$$;

REVOKE ALL ON TABLE scotty_p5_synthetic_memory_identity_acl FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_memory_items FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scotty_p5_synthetic_memory_allows(TEXT,TEXT) FROM PUBLIC;

ALTER TABLE scotty_p5_synthetic_memory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scotty_p5_synthetic_memory_items FORCE ROW LEVEL SECURITY;

CREATE POLICY scotty_p5_synthetic_individual_memory_select
ON scotty_p5_synthetic_memory_items
FOR SELECT TO PUBLIC
USING (
 memory_scope = 'individual'
 AND data_class = 'synthetic-only'
 AND public.scotty_p5_synthetic_memory_allows(project_id,owner_agent_id)
);

COMMENT ON TABLE scotty_p5_synthetic_memory_items IS
 'Disposable synthetic fixtures only. Never insert real personal or agent memory.';
COMMIT;
