#!/usr/bin/env node
/**
 * Read-only B3 combined candidate-coverage report.
 * No source fetch, private file, persisted DB, agent, owner grant or payment.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "../src/knowledge/phase3-evidence-queue.mjs";
import {reconcileB3PublicSourceCoverage} from "../src/knowledge/phase3-unified-public-coverage.mjs";
if(process.argv.length!==2)throw Error("No live, write, fetch, approval, export of private data or deploy options");
const read=path=>{
 const b=readFileSync(new URL(path,import.meta.url));
 return {json:JSON.parse(b.toString("utf8")),
  gitBlob:createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex")};
};
const frozen=read("../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../docs/a0/roster-freeze-lock-2026-11-07.json").json;
if(frozen.gitBlob!==lock.snapshotGitBlobSha)
 throw Error("OWNER_APPROVED_FROZEN_ROSTER_MISMATCH");
const json=path=>read("../docs/stage-b/"+path).json;
const queue=createPhase3EvidenceQueue(createPhase1BrainDrafts(frozen.json,lock));
const result=reconcileB3PublicSourceCoverage({
 frozen:frozen.json,queue,
 chief1:json("b3-public-source-pilot-2026-11-08.json"),
 chief2:json("b3-public-source-expansion-2026-11-08.json"),
 chief3:json("b3-final-fifteen-chief-public-sources-2026-11-08.json"),
 bonesEight:json("b3-first-eight-specialist-public-pilot-2026-11-08.json"),
 dataEleven:json("b3-next-eleven-specialist-public-pilot-2026-11-08.json"),
 expansionTen:json("b3-next-ten-expansion-specialist-public-pilot-2026-11-08.json"),
 expansionNextTen:json("b3-second-ten-expansion-specialist-public-pilot-2026-11-08.json"),
 expansionThirdTen:json("b3-third-ten-expansion-specialist-public-pilot-2026-11-08.json")
});
process.stdout.write(JSON.stringify(result,null,2)+"\n");
