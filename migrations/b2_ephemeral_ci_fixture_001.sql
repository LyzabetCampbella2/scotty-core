-- B2 CI-only synthetic persistence fixture. NEVER run on production/staging.
-- This SQL is loaded exclusively by test code guarded for GitHub Actions,
-- localhost and the exact disposable database scotty_b2_ci.
BEGIN;
create table if not exists scotty_b2_fixture_memory (
 memory_id uuid primary key,
 agent_id text not null,
 department text not null,
 project_id text,
 scope text not null default 'individual'
   check(scope in ('individual','department','project','explicit_shared','owner_only')),
 status text not null default 'candidate'
   check(status in ('candidate','accepted','superseded','archived','deleted')),
 data_class text not null default 'SYNTHETIC_PUBLIC'
   check(data_class='SYNTHETIC_PUBLIC'),
 content text,
 content_sha256 text,
 version integer not null default 1 check(version>=1),
 supersedes_id uuid references scotty_b2_fixture_memory(memory_id),
 source_id text not null,
 recipients text[] not null default '{}',
 consent_ref text,
 expires_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(
  (status='deleted' and content is null and content_sha256 is null)
  or
  (status<>'deleted' and content like 'SYNTHETIC:%' and content_sha256 ~ '^[0-9a-f]{64}$')
 ),
 check(scope<>'project' or project_id is not null)
);
create unique index if not exists scotty_b2_fixture_active_dedupe
 on scotty_b2_fixture_memory(agent_id, (coalesce(project_id,'')), content_sha256)
 where status in ('candidate','accepted');
create index if not exists scotty_b2_fixture_lookup
 on scotty_b2_fixture_memory(status,agent_id,department,project_id,expires_at);
create table if not exists scotty_b2_fixture_audit (
 event_id uuid primary key,
 memory_id uuid references scotty_b2_fixture_memory(memory_id),
 actor_id text not null,
 event_type text not null,
 at timestamptz not null default now(),
 synthetic_fixture boolean not null default true check(synthetic_fixture=true)
);
COMMIT;
