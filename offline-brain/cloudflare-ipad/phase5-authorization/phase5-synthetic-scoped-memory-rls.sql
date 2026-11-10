-- DISPOSABLE CI ONLY: synthetic departmental/shared memory RLS boundary.
-- Requires admin-controlled verified-consent receipts; PostgreSQL does NOT
-- itself validate Ed25519 signatures. No real owner approvals or memory rows.
BEGIN;
DO $$
BEGIN
 IF current_database() <> 'scotty_phase5_synthetic_test' THEN
  RAISE EXCEPTION 'Refusing scoped synthetic memory RLS outside disposable test database';
 END IF;
END $$;

CREATE TABLE scotty_p5_synthetic_scoped_identity_acl (
 login_name TEXT PRIMARY KEY CHECK (login_name LIKE 'scotty_p5_agent_%'),
 agent_id TEXT NOT NULL CHECK (agent_id IN ('agent-creative-pulse','agent-creative-iris','agent-creative-orion')),
 project_id TEXT NOT NULL CHECK (project_id IN ('SYN-PROJECT-REVIEW','SYN-PROJECT-OTHER')),
 chief_id TEXT NOT NULL CHECK (chief_id IN ('SYN-CHIEF-A','SYN-CHIEF-B')),
 active BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE scotty_p5_synthetic_scoped_memory_items (
 memory_id TEXT PRIMARY KEY CHECK (memory_id ~ '^SYN-MEM-[A-Z0-9-]{1,100}$'),
 project_id TEXT NOT NULL CHECK (project_id IN ('SYN-PROJECT-REVIEW','SYN-PROJECT-OTHER')),
 owner_agent_id TEXT NOT NULL CHECK (owner_agent_id IN ('agent-creative-pulse','agent-creative-iris','agent-creative-orion')),
 owner_chief_id TEXT NOT NULL CHECK (owner_chief_id IN ('SYN-CHIEF-A','SYN-CHIEF-B')),
 memory_scope TEXT NOT NULL CHECK (memory_scope IN ('departmental','shared')),
 data_class TEXT NOT NULL CHECK (data_class = 'synthetic-only'),
 payload TEXT NOT NULL CHECK (left(payload,4)='SYN-')
);

CREATE TABLE scotty_p5_synthetic_verified_consent_receipts (
 grant_id TEXT NOT NULL,
 revision INTEGER NOT NULL,
 test_verified BOOLEAN NOT NULL DEFAULT FALSE CHECK (test_verified IS TRUE),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(grant_id,revision),
 FOREIGN KEY(grant_id,revision)
  REFERENCES scotty_p5_synthetic_consent_versions(grant_id,revision)
);
CREATE TRIGGER scotty_p5_receipts_append_only
 BEFORE UPDATE OR DELETE ON scotty_p5_synthetic_verified_consent_receipts
 FOR EACH ROW EXECUTE FUNCTION public.scotty_p5_consent_forbid_mutation();

-- DB roles cannot set request-specific agent/project/Chief values. They are
-- resolved exclusively by the authenticated PostgreSQL session_user, not
-- by current_user (SECURITY DEFINER) or client-settable custom settings.
CREATE FUNCTION public.scotty_p5_synthetic_scoped_memory_allows(
 p_project TEXT,p_owner TEXT,p_owner_chief TEXT,p_scope TEXT,p_resource TEXT
) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $$
 SELECT EXISTS (
  SELECT 1
   FROM public.scotty_p5_synthetic_scoped_identity_acl a
   JOIN public.scotty_p5_synthetic_consent_versions v
    ON v.actor_id=a.agent_id
   JOIN public.scotty_p5_synthetic_consent_state s
    ON s.grant_id=v.grant_id AND s.current_revision=v.revision
   JOIN public.scotty_p5_synthetic_verified_consent_receipts receipt
    ON receipt.grant_id=v.grant_id AND receipt.revision=v.revision
   JOIN public.scotty_p5_synthetic_emergency_stop kill
    ON kill.scope='synthetic'
   WHERE a.login_name=session_user::text
     AND a.active IS TRUE
     AND a.project_id=p_project
     AND v.project_id=p_project
     AND v.memory_owner_id=p_owner
     AND v.resource_id=p_resource
     AND v.scope=p_scope
     AND v.status='synthetic-approved-review'
     AND receipt.test_verified IS TRUE
     AND s.revoked IS FALSE
     AND kill.stopped IS FALSE
     AND v.issued_at <= (extract(epoch from now())*1000)::bigint
     AND v.expires_at > (extract(epoch from now())*1000)::bigint
     AND ((p_scope='departmental' AND a.chief_id=p_owner_chief)
        OR p_scope='shared')
 );
$$;

REVOKE ALL ON TABLE scotty_p5_synthetic_scoped_identity_acl FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_scoped_memory_items FROM PUBLIC;
REVOKE ALL ON TABLE scotty_p5_synthetic_verified_consent_receipts FROM PUBLIC;
REVOKE ALL ON FUNCTION public.scotty_p5_synthetic_scoped_memory_allows(TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;

ALTER TABLE scotty_p5_synthetic_scoped_memory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scotty_p5_synthetic_scoped_memory_items FORCE ROW LEVEL SECURITY;
CREATE POLICY scotty_p5_synthetic_scoped_memory_read
 ON scotty_p5_synthetic_scoped_memory_items FOR SELECT TO PUBLIC
 USING (
   data_class='synthetic-only'
   AND memory_scope IN ('departmental','shared')
   AND public.scotty_p5_synthetic_scoped_memory_allows(
    project_id,owner_agent_id,owner_chief_id,memory_scope,memory_id)
 );

COMMENT ON TABLE scotty_p5_synthetic_scoped_memory_items IS
 'Fictional department/shared rows; RLS uses active consent plus privileged synthetic verification receipt. No production access.';
COMMIT;
