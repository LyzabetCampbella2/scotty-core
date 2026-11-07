// Synthetic CI-only integration against an ephemeral disposable PostgreSQL instance.
// Never run against SCOTTY production or a long-lived staging database.
import test, {after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import postgres from "postgres";
import {initializeA0} from "./a0-ledger.mjs";

const url=process.env.A0_CI_DATABASE_URL;
if(process.env.GITHUB_ACTIONS!=="true" ||
   process.env.SCOTTY_A0_EPHEMERAL_DB_TEST!=="yes" ||
   !url ||
   new URL(url).hostname!=="127.0.0.1" ||
   new URL(url).pathname!=="/scotty_a0_ci"){
 throw Error("Refusing A0 integration testing outside an explicitly configured local disposable GitHub Actions database");
}
const sql=postgres(url,{ssl:false,max:4});
after(async()=>{await sql.end({timeout:2});});
const raw=readFileSync(new URL("../../migrations/a0_staging_001.sql",import.meta.url),"utf8");
const stmts=raw.split("\n").filter(line=>!line.trim().startsWith("--")).join("\n")
 .split(";").map(s=>s.trim()).filter(s=>s&&s!=="BEGIN"&&s!=="COMMIT");
assert.equal(stmts.length,6,"Unexpected migration operation count");
await sql.begin(async tx=>{for(const statement of stmts)await tx.unsafe(statement);});
const store=await initializeA0(sql,"scotty_a0_ci");
const make=(suffix,changes={})=>{
 const base={
  grantId:"11111111-1111-4111-8111-"+suffix.padStart(12,"0"),
  ownerId:"owner-ci",agentId:"agent-spock-01",projectId:"project-ci",
  taskId:"task-ci",action:"read-public",resourceId:"public-doc-ci",
  accountId:"",channelId:"",revision:"rev-ci",toolId:"web-read",
  dataClass:"SYNTHETIC_PUBLIC",idempotencyKey:"idem-"+suffix,
  approvalEvidenceId:"synthetic-owner-review-ci",
  issuedAt:"2026-11-07T12:00:00Z",expiresAt:"2026-11-07T13:00:00Z"
 };
 return {...base,...changes};
};
const request=g=>({
 agentId:g.agentId,projectId:g.projectId,taskId:g.taskId,
 action:g.action,resourceId:g.resourceId,accountId:g.accountId,
 channelId:g.channelId,revision:g.revision,toolId:g.toolId,
 dataClass:g.dataClass,idempotencyKey:g.idempotencyKey,
 grantId:g.grantId,estimatedCostUsd:0
});
const now=new Date("2026-11-07T12:15:00Z");
test("A0 PostgreSQL synthetic staging integration (no external actions)", async t=>{
 await t.test("safe schema defaults refuse reservations",async()=>{
  const status=await store.status();
  assert.equal(status.stopAll,true);
  assert.equal(status.enabled,false);
  assert.equal(status.budgetApproved,false);
  assert.equal(status.externalExecutionEnabled,false);
  const g=make("1");
  await store.createGrant(g);
  const decision=await store.claim(request(g),"owner-ci",now);
  assert.equal(decision.permitted,false);
 });
 await t.test("database identity guard rejects mismatch",async()=>{
  await assert.rejects(initializeA0(sql,"not_this_database"),/Unexpected A0 database/);
 });
 await t.test("manual CI-only control enabling permits one synthetic reservation",async()=>{
  // This update targets ONLY ephemeral a0_ci; there is no enable HTTP endpoint.
  await sql`update scotty_a0_control set stop_all=false,enabled=true,budget_approved=true where id=1`;
  const g=make("2");
  await store.createGrant(g);
  const first=await store.claim(request(g),"owner-ci",now);
  assert.equal(first.permitted,true);
  assert.equal(first.externalActionExecuted,false);
  const second=await store.claim(request(g),"owner-ci",now);
  assert.equal(second.permitted,false);
 });
 await t.test("forged project denied",async()=>{
  const g=make("3");await store.createGrant(g);
  const decision=await store.claim({...request(g),projectId:"different-project"},"owner-ci",now);
  assert.equal(decision.permitted,false);
 });
 await t.test("revoked grant denied",async()=>{
  const g=make("4");await store.createGrant(g);await store.revokeGrant(g.grantId,"owner-ci");
  const decision=await store.claim(request(g),"owner-ci",now);
  assert.equal(decision.permitted,false);
 });
 await t.test("two competing requests consume at most one grant",async()=>{
  const g=make("5");await store.createGrant(g);
  const [a,b]=await Promise.all([store.claim(request(g),"owner-ci",now),store.claim(request(g),"owner-ci",now)]);
  assert.equal([a,b].filter(x=>x.permitted).length,1);
 });
 await t.test("emergency stop immediately blocks subsequent claims",async()=>{
  await store.stopAll("owner-ci");
  const g=make("6");await store.createGrant(g);
  const decision=await store.claim(request(g),"owner-ci",now);
  assert.equal(decision.permitted,false);
  const status=await store.status();
  assert.equal(status.stopAll,true);
  assert.equal(status.enabled,false);
 });
 await t.test("audit and single-use receipt are durably recorded",async()=>{
  const [audit]=await sql`select count(*)::int as count from scotty_a0_audit`;
  const [claims]=await sql`select count(*)::int as count from scotty_a0_claim`;
  assert.ok(audit.count>=8);assert.equal(claims.count,2);
 });
});
