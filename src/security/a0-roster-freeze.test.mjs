import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";

function load(path) {
 const bytes=readFileSync(new URL(path,import.meta.url));
 return {raw:bytes,obj:JSON.parse(bytes.toString("utf8")),blob:createHash("sha1").update("blob "+bytes.length+"\\0").update(bytes).digest("hex")};
}
test("owner-approved 185-agent roster freeze is byte-pinned and matches original candidate",()=>{
 const lock=load("../../docs/a0/roster-freeze-lock-2026-11-07.json").obj;
 const frozen=load("../../docs/a0/roster-frozen-2026-11-07.json");
 const candidate=load("../../docs/a0/roster-candidate-2026-11-07.json");
 assert.equal(lock.status,"OWNER_APPROVED_FROZEN_GIT_VERSION");
 assert.equal(frozen.blob,lock.snapshotGitBlobSha,"Locked frozen roster must be immutable");
 assert.equal(candidate.blob,lock.candidateGitBlobSha,"Candidate source version has drifted");
 assert.deepEqual(frozen.obj.records,candidate.obj.records,"No field may change without new owner-reviewed version");
 assert.equal(frozen.obj.records.length,185);
 assert.equal(new Set(frozen.obj.records.map(x=>x["Agent ID"])).size,185);
 assert.equal(frozen.obj.records.filter(x=>x.Role==="Chief").length,25);
 assert.equal(frozen.obj.records.filter(x=>x.Role==="Specialist").length,160);
 assert.equal(new Set(frozen.obj.records.map(x=>x.Department)).size,25);
 assert.equal(frozen.obj.freezeStatus,"OWNER_APPROVED_VERSIONED_SNAPSHOT");
 assert.equal(frozen.obj.ownerDecision.cryptographicSignature,false);
 assert.equal(frozen.obj.ownerDecision.notApproved.includes("new agent activation"),true);
});
