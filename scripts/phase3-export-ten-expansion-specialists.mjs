#!/usr/bin/env node
/**
 * Read-only, immutable-roster-checked 10 expansion source review export.
 * No fetch, agent activation, model call, approval or private-data access.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "../src/knowledge/phase3-evidence-queue.mjs";
import {validateTenExpansionSpecialists} from "../src/knowledge/phase3-ten-expansion-specialists.mjs";
if(process.argv.length!==2)throw Error("No write, fetch, owner approval, deployment or activation argument accepted");
const load=p=>{
 const bytes=readFileSync(new URL(p,import.meta.url));
 return {json:JSON.parse(bytes.toString("utf8")),
  blob:createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex")};
};
const roster=load("../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../docs/a0/roster-freeze-lock-2026-11-07.json").json;
if(roster.blob!==lock.snapshotGitBlobSha)
 throw Error("B3_OWNER_FROZEN_AGENT_ROSTER_HASH_MISMATCH");
const first=load("../docs/stage-b/b3-public-source-pilot-2026-11-08.json").json;
const second=load("../docs/stage-b/b3-public-source-expansion-2026-11-08.json").json;
const third=load("../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json").json;
const eight=load("../docs/stage-b/b3-first-eight-specialist-public-pilot-2026-11-08.json").json;
const eleven=load("../docs/stage-b/b3-next-eleven-specialist-public-pilot-2026-11-08.json").json;
const ten=load("../docs/stage-b/b3-next-ten-expansion-specialist-public-pilot-2026-11-08.json").json;
const drafts=createPhase1BrainDrafts(roster.json,lock);
const queue=createPhase3EvidenceQueue(drafts);
const report=validateTenExpansionSpecialists(ten,eleven,eight,roster.json,queue,first,second,third);
process.stdout.write(JSON.stringify(report,null,2)+"\n");
