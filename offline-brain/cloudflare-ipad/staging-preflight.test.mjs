import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {stagingPreflight,LAB_BRANCH,LAB_NAME} from "./staging-preflight.mjs";
const original=JSON.parse(readFileSync(new URL("./wrangler.jsonc",import.meta.url),"utf8"));
const clone=x=>JSON.parse(JSON.stringify(x));
test("default-off Worker is scoped to the dedicated lab memory",()=>{
 const p=stagingPreflight({config:clone(original)});
 assert.equal(p.pass,true,p.errors.join(", "));
 assert.equal(p.name,LAB_NAME);assert.equal(p.aiDefault,"OFF");assert.equal(p.productionConnections,0);
 assert.equal(p.billingPlanCheckedProgrammatically,false);
});
test("Cloudflare CI fails before any deploy until account Free and exact isolated branch confirmed",()=>{
 const a=stagingPreflight({config:clone(original),env:{WORKERS_CI:"1",WORKERS_CI_BRANCH:LAB_BRANCH}});
 assert.equal(a.pass,false);assert.ok(a.errors.some(s=>s.includes("Workers Free")));
 const b=stagingPreflight({config:clone(original),env:{WORKERS_CI:"1",WORKERS_CI_BRANCH:"main",SCOTTY_STAGING_FREE_CONFIRMED:"YES_CONFIRMED_WORKERS_FREE"}});
 assert.equal(b.pass,false);assert.ok(b.errors.some(s=>s.includes("branch")));
 const valid=stagingPreflight({config:clone(original),env:{WORKERS_CI:"1",WORKERS_CI_BRANCH:LAB_BRANCH,SCOTTY_STAGING_FREE_CONFIRMED:"YES_CONFIRMED_WORKERS_FREE"}});
 assert.equal(valid.pass,true,valid.errors.join(", "));
});
test("wrong worker name is blocked",()=>{
 const cfg=clone(original);cfg.name="scotty-core";
 assert.equal(stagingPreflight({config:cfg}).pass,false);
});
test("AI without dedicated memory and unknown resources are blocked",()=>{
 for(const key of ["kv_namespaces","d1_databases","r2_buckets","durable_objects","routes","triggers","services"]){
  const cfg=clone(original);cfg[key]=[{id:"should-never-add"}];
  assert.equal(stagingPreflight({config:cfg}).pass,false,key);
 }
 const cfg=clone(original);delete cfg.d1_databases;
 assert.equal(stagingPreflight({config:cfg}).pass,false);
});
test("plaintext secrets in public configuration are refused",()=>{
 const cfg=clone(original);cfg.vars.DATABASE_URL="postgres://example";
 assert.equal(stagingPreflight({config:cfg}).pass,false);
});


test("database substitution, additional bindings and preview overrides are refused",()=>{
 for(const change of [d=>d.database_id="another-database",d=>d.database_name="production",d=>d.binding="DB",d=>d.preview_database_id="other"]){
  const cfg=clone(original);change(cfg.d1_databases[0]);assert.equal(stagingPreflight({config:cfg}).pass,false);
 }
 const cfg=clone(original);cfg.d1_databases.push({...cfg.d1_databases[0]});assert.equal(stagingPreflight({config:cfg}).pass,false);
 const off=clone(original);off.vars.AI_ENABLED="false";delete off.d1_databases;assert.equal(stagingPreflight({config:off}).pass,false);
});

test("staging configuration never enables AI before explicit owner activation",()=>{
 assert.equal(original.vars.AI_ENABLED,"false");
 const state=stagingPreflight({config:clone(original)});
 assert.equal(state.pass,true);
 assert.equal(state.aiDefault,"OFF");
});
