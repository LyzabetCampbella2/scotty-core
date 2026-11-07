import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";

test("A0 remains uncertified without real restore, owner signature and isolated infrastructure",()=>{
 const location=new URL("../../docs/a0/certification-evidence.json",import.meta.url);
 const evidence=JSON.parse(readFileSync(location,"utf8"));
 assert.equal(evidence.certificationStatus,"BLOCKED");
 const result=spawnSync(process.execPath,[new URL("../../scripts/a0-exit-status.mjs",import.meta.url).pathname,location.pathname],{encoding:"utf8"});
 assert.equal(result.status,2);
 const summary=JSON.parse(result.stdout);
 assert.equal(summary.readyForNextPhase,false);
 assert.ok(summary.blockingItems.includes("isolated_staging_resource:blocked"));
 assert.ok(summary.blockingItems.includes("real_encrypted_backup_restored_independently:pending"));
 assert.ok(summary.blockingItems.includes("owner_signed_phase_0_acceptance:pending"));
 assert.ok(summary.blockingItems.some(x=>x.startsWith("owner-signoff:")));
});
