-- Staging-only additive schema; review before applying to any database.
-- No existing tables altered; NO automatic migration.
create table if not exists scotty_workspace_records_v1 (
  record_key text primary key,
  project_id text not null,
  record_kind text not null check(record_kind in ('assignment','knowledge','audit')),
  record_id text not null,
  payload jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  unique(project_id,record_kind,record_id)
);
create index if not exists scotty_workspace_records_v1_project_kind_idx
  on scotty_workspace_records_v1(project_id,record_kind);
-- Deny direct access by default. Trusted server uses a separately granted role.
alter table scotty_workspace_records_v1 enable row level security;
alter table scotty_workspace_records_v1 force row level security;
-- Intentionally no permissive RLS policy. The deployment owner must add
-- narrowly scoped policies and a trusted transaction-local project context
-- after verifying the existing identity and database role architecture.
