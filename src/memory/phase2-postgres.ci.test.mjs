// B2 CI ONLY: disposable PostgreSQL at 127.0.0.1/scotty_b2_ci.
// NEVER execute this test against production, existing Render, Railway or Neon.
import test,{after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import postgres from "postgres";
import {assertEphemeralB2Ci,openEphemeralB2Fixture} from "./phase2-postgres-fixture.mjs";

const url=assertEphemeralB2Ci(); // fail before opening a connection
const frozen=JSON.parse(readFileSync(new URL("../../docs/a0/roster-frozen-2026-11-07.json",import.meta.url),"utf8"));
const sql=postgres(url,{ssl:false,max:5,connect_timeout:5});
after(async()=>await sql.end({timeout:2}));
const migration=readFileSync(new URL("../../migrations/b2_ephemeral_ci_fixture_001.sql",import.meta.url),"utf8")
 .split("\n").filter(line=>!line.trim().startsWith("--")).join("\n");
const statements=migration.split(";").map(x=>x.trim()).filter(x=>x&&x!=="BEGIN"&&x!=="COMMIT");
assert.equal(statements.length,4,"Unexpected B2 fixture migration operation count");
await sql.begin(async tx=>{for(const s of statements)await tx.unsafe(s);});
const store=await openEphemeralB2Fixture(sql,frozen);
const rows=frozen.records;
const specialist=rows.find(r=>r.Role==="Specialist");
const peer=rows.find(r=>r.Role==="Specialist"&&r.Department===specialist.Department&&r["Agent ID"]!==specialist["Agent ID"]);
const other=rows.find(r=>r.Role==="Specialist"&&r.Department!==specialist.Department);
const chief=rows.find(r=>r.Role==="Chief"&&r.Department===specialist.Department);
const owner=store.testOwner();
const actor=store.testAgent(specialist["Agent ID"]);
const same=store.testAgent(peer["Agent ID"]);
const outsider=store.testAgent(other["Agent ID"]);
const create=(handle,content,more={})=>store.createCandidate(handle,{content,...more});
const find=(handle,query,more={})=>store.find(handle,{query,...more});

test("B2 synthetic ephemeral PostgreSQL persistence and isolation",async t=>{
 await t.test("canonical 185-identity fixture requires test-issued handles",async()=>{
  assert.equal(rows.length,185);
  assert.equal(await store.status().then(s=>s.disposableCiDatabase),true);
  assert.equal((await store.status()).realOwnerAuthentication,false);
  await assert.rejects(find({agentId:specialist["Agent ID"]},"example"),/FORGED_SYNTHETIC_TEST_SESSION/);
  await assert.rejects(find(owner,"example"),/TEST_AGENT_ONLY/);
  await assert.rejects(create(actor,"Real user text without fixture prefix"),/INVALID_SYNTHETIC_CANDIDATE/);
  await assert.rejects(create(actor,"SYNTHETIC: test",{projectId:"not-authorized"}),/INVALID_SYNTHETIC_CANDIDATE/);
 });
 await t.test("candidate is hidden; acceptance persists, owner-only test handle",async()=>{
  const c=await create(actor,"SYNTHETIC: individual trial");
  assert.equal((await find(actor,"individual trial")).length,0);
  await assert.rejects(store.acceptForTest(actor,c.memoryId),/TEST_OWNER_ONLY/);
  await store.acceptForTest(owner,c.memoryId);
  assert.equal((await find(actor,"individual trial")).length,1);
  assert.equal((await find(same,"individual trial")).length,0);
  assert.equal((await find(outsider,"individual trial")).length,0);
  const dupe=await create(actor,"SYNTHETIC: individual trial");
  assert.equal(dupe.deduplicated,true);
  assert.equal(dupe.memoryId,c.memoryId);
  assert.equal(dupe.realOwnerApproval,false);
 });
 await t.test("department share is opt-in, and cannot reach other departments",async()=>{
  const c=await create(actor,"SYNTHETIC: department memorandum");
  await store.acceptForTest(owner,c.memoryId);
  assert.equal((await find(same,"department memorandum")).length,0);
  await assert.rejects(store.shareForTest(actor,c.memoryId,{scope:"department",consentRef:"synthetic-consent-1"}),/TEST_OWNER_ONLY/);
  await store.shareForTest(owner,c.memoryId,{scope:"department",consentRef:"synthetic-consent-1"});
  assert.equal((await find(same,"department memorandum")).length,1);
  assert.equal((await find(outsider,"department memorandum")).length,0);
  await assert.rejects(store.shareForTest(owner,c.memoryId,{scope:"owner_only",consentRef:"synthetic-consent-2"}),/INVALID_SYNTHETIC_SHARE/);
 });
 await t.test("project scope and project-tagged department sharing require fixture membership",async()=>{
  const project="ci-project-a";
  const maker=store.testAgent(specialist["Agent ID"],{projects:[project]});
  const allowed=store.testAgent(peer["Agent ID"],{projects:[project]});
  const crossDept=store.testAgent(other["Agent ID"],{projects:[project]});
  const c=await create(maker,"SYNTHETIC: project contract draft",{projectId:project});
  await store.acceptForTest(owner,c.memoryId);
  await store.shareForTest(owner,c.memoryId,{scope:"project",consentRef:"synthetic-consent-project"});
  assert.equal((await find(maker,"project contract")).length,1);
  assert.equal((await find(allowed,"project contract")).length,1);
  assert.equal((await find(crossDept,"project contract")).length,1);
  assert.equal((await find(actor,"project contract")).length,0);
  assert.equal((await find(allowed,"project contract",{projectId:"ci-project-b"})).length,0);
  const d=await create(maker,"SYNTHETIC: project departmental plan",{projectId:project});
  await store.acceptForTest(owner,d.memoryId);
  await store.shareForTest(owner,d.memoryId,{scope:"department",consentRef:"synthetic-consent-dept"});
  assert.equal((await find(allowed,"departmental plan")).length,1);
  assert.equal((await find(same,"departmental plan")).length,0);
  assert.equal((await find(crossDept,"departmental plan")).length,0);
 });
 await t.test("recipient-specific synthetic sharing blocks unlisted agents",async()=>{
  const c=await create(actor,"SYNTHETIC: private consented memo");
  await store.acceptForTest(owner,c.memoryId);
  await assert.rejects(store.shareForTest(owner,c.memoryId,{
    scope:"explicit_shared",recipients:["invalid-agent"],consentRef:"synthetic-consent-users"
  }),/INVALID_SYNTHETIC_SHARE/);
  await store.shareForTest(owner,c.memoryId,{
    scope:"explicit_shared",recipients:[peer["Agent ID"]],consentRef:"synthetic-consent-users"
  });
  assert.equal((await find(same,"consented memo")).length,1);
  assert.equal((await find(actor,"consented memo")).length,0);
  assert.equal((await find(outsider,"consented memo")).length,0);
 });
 await t.test("correction versions require second acceptance, old text no longer searchable",async()=>{
  const c=await create(actor,"SYNTHETIC: obsolete fact");
  await store.acceptForTest(owner,c.memoryId);
  const next=await store.correctForTest(owner,c.memoryId,"SYNTHETIC: corrected fact");
  assert.equal(next.status,"candidate");
  assert.equal(next.version,2);
  assert.equal(next.supersedesId,c.memoryId);
  assert.equal((await find(actor,"obsolete fact")).length,0);
  assert.equal((await find(actor,"corrected fact")).length,0);
  await store.acceptForTest(owner,next.memoryId);
  assert.equal((await find(actor,"corrected fact")).length,1);
  const removed=await store.deleteForTest(owner,next.memoryId);
  assert.equal(removed.syntheticTextDeleted,true);
  assert.equal(removed.realDataDeletion,false);
  assert.equal((await find(actor,"corrected fact")).length,0);
  const [raw]=await sql.unsafe("select content,content_sha256,status from scotty_b2_fixture_memory where memory_id=$1",[next.memoryId]);
  assert.equal(raw.content,null);
  assert.equal(raw.content_sha256,null);
  assert.equal(raw.status,"deleted");
 });
 await t.test("expired fixture text is hidden then erased without claiming real retention",async()=>{
  const c=await create(actor,"SYNTHETIC: short lived reminder",{expiresAt:"2026-11-08T13:00:00Z"});
  await store.acceptForTest(owner,c.memoryId);
  assert.equal((await find(actor,"short lived",{at:"2026-11-08T12:00:00Z"})).length,1);
  assert.equal((await find(actor,"short lived",{at:"2026-11-08T13:00:00Z"})).length,0);
  const res=await store.expireForTest(owner,"2026-11-08T14:00:00Z");
  assert.ok(res.syntheticErased>=1);
  assert.equal(res.realRetentionEnforced,false);
  const [raw]=await sql.unsafe("select content,status from scotty_b2_fixture_memory where memory_id=$1",[c.memoryId]);
  assert.equal(raw.content,null);
  assert.equal(raw.status,"deleted");
 });
 await t.test("a new store object retains SQL state but rejects old test-session handles",async()=>{
  const before=await store.status();
  const reopened=await openEphemeralB2Fixture(sql,frozen);
  const fresh=reopened.testAgent(specialist["Agent ID"]);
  const found=await reopened.find(fresh,{query:"individual trial"});
  assert.equal(found.length,1);
  assert.equal(found[0].content,"SYNTHETIC: individual trial");
  assert.equal(found[0].realDataAccess,false);
  await assert.rejects(reopened.find(actor,{query:"individual trial"}),/FORGED_SYNTHETIC_TEST_SESSION/);
  assert.equal((await reopened.status()).memoryRecords,before.memoryRecords);
  const history=await reopened.auditForTest(reopened.testOwner());
  assert.ok(history.length>=8);
  assert.ok(history.every(e=>e.event_type&&e.memory_id));
 });
 await t.test("all records stay fictional with the fixed classification",async()=>{
  const [counts]=await sql.unsafe("select count(*)::int as total, count(*) filter(where data_class<>'SYNTHETIC_PUBLIC')::int as non_synthetic from scotty_b2_fixture_memory");
  assert.ok(counts.total>=6);
  assert.equal(counts.non_synthetic,0);
  assert.ok(chief);
 });
});
