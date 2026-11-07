-- SCOTTY Stage A0: STAGING ONLY, DO NOT RUN ON PRODUCTION.
-- Apply manually ONLY after the owner approves this exact staging database and
-- a verified staging schema/data backup exists. Requires separate approval.
-- Not run automatically by application startup or an API request.
-- Tested at source review only; live migration and rollback are NOT verified.
BEGIN;
create table if not exists scotty_a0_control(
    id smallint primary key check(id=1), stop_all boolean not null default true,
    enabled boolean not null default false, budget_approved boolean not null default false,
    paid_actions_enabled boolean not null default false,
    task_cap_cents bigint not null default 0 check(task_cap_cents>=0),
    daily_cap_cents bigint not null default 0 check(daily_cap_cents>=0),
    max_retries integer not null default 0 check(max_retries>=0),
    max_concurrent integer not null default 1 check(max_concurrent>=0),
    active_runs integer not null default 0 check(active_runs>=0),
    updated_at timestamptz not null default now()
  );

insert into scotty_a0_control(id) values(1) on conflict do nothing;

create table if not exists scotty_a0_grant(
    grant_id uuid primary key, owner_id text not null, agent_id text not null,
    project_id text not null, task_id text not null, action text not null,
    resource_id text not null, account_id text not null, channel_id text not null,
    revision text not null, tool_id text not null, data_class text not null,
    idempotency_key text not null, approval_evidence_id text not null,
    issued_at timestamptz not null, expires_at timestamptz not null,
    status text not null default 'approved' check(status in ('approved','revoked')),
    revoked_at timestamptz, used_count integer not null default 0 check(used_count in (0,1)),
    max_spend_cents bigint not null default 0 check(max_spend_cents=0),
    check(expires_at>issued_at and expires_at<=issued_at+interval '24 hours')
  );

create index if not exists scotty_a0_grant_scope_idx on scotty_a0_grant(project_id,task_id,issued_at desc);

create table if not exists scotty_a0_claim(
    claim_id uuid primary key, grant_id uuid not null references scotty_a0_grant(grant_id),
    request_key text not null unique, project_id text not null, task_id text not null,
    cost_cents bigint not null default 0 check(cost_cents=0),
    created_at timestamptz not null default now()
  );

create table if not exists scotty_a0_audit(
    event_id uuid primary key, at timestamptz not null default now(),
    event_type text not null, actor_id text not null,
    grant_id uuid, project_id text, task_id text, result text not null,
    evidence_id text
  );
COMMIT;
