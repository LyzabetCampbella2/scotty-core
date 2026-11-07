import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const file = new URL("../../docs/a0/roster-candidate-2026-11-07.json",import.meta.url);
const roster=JSON.parse(readFileSync(file,"utf8"));
test("Stage A0 candidate retains exactly 185 canonical identities and a separate overseer",()=>{
 assert.equal(roster.approvalStatus,"OWNER_REVIEW_REQUIRED");
 assert.equal(roster.freezeStatus,"CANDIDATE_NOT_FROZEN");
 assert.match(roster.scottyOverseer,/Separate/);
 assert.equal(roster.records.length,185);
 assert.equal(new Set(roster.records.map(r=>r["Agent ID"])).size,185);
 const roles={Chief:roster.records.filter(r=>r.Role==="Chief"),Specialist:roster.records.filter(r=>r.Role==="Specialist")};
 assert.equal(roles.Chief.length,25);
 assert.equal(roles.Specialist.length,160);
 assert.equal(new Set(roster.records.map(r=>r.Department)).size,25);
 const byChief=new Map(roles.Chief.map(c=>[c["Agent ID"],c]));
 for(const item of roster.records){
   assert.match(item["Agent ID"],/^(chief|agent)-[a-zA-Z0-9-]+$/);
   assert.ok(item.Name && item.Department && item.Specialty);
   if(item.Role==="Specialist"){
    assert.ok(byChief.has(item["Chief ID"]),item["Agent ID"]);
    assert.equal(byChief.get(item["Chief ID"]).Department,item.Department);
   } else assert.equal(item["Chief ID"],"");
 }
 for(const department of new Set(roster.records.map(r=>r.Department))){
   assert.equal(roles.Chief.filter(c=>c.Department===department).length,1);
 }
});
test("Stage A0 candidate is explicitly not a certified roster",()=>{
 assert.ok(roster.records.every(r=>/Development|not executing/i.test(r["Runtime Status"])));
});
