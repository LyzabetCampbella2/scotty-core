import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("A0 schema requires an explicit separate migration (no implicit DDL on reads)",()=>{
  const source=readFileSync(new URL("./a0-ledger.mjs",import.meta.url),"utf8");
  const sql=readFileSync(new URL("../../migrations/a0_staging_001.sql",import.meta.url),"utf8");
  assert.equal(source.includes("create table if not exists"),false);
  assert.equal(source.includes("create index if not exists"),false);
  assert.match(source,/to_regclass\('public\.scotty_a0_control'\)/);
  assert.match(source,/staging migration required/);
  assert.match(sql,/BEGIN;/);
  assert.match(sql,/COMMIT;/);
  assert.match(sql,/stop_all boolean not null default true/);
  assert.match(sql,/enabled boolean not null default false/);
  assert.match(sql,/budget_approved boolean not null default false/);
  assert.match(sql,/paid_actions_enabled boolean not null default false/);
  assert.match(sql,/max_spend_cents bigint not null default 0 check\(max_spend_cents=0\)/);
  assert.match(sql,/insert into scotty_a0_control\(id\) values\(1\) on conflict do nothing/);
});
