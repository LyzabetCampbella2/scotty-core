#!/usr/bin/env node
/**
 * B3 read-only, SHA-locked export of public metadata inspection for 11
 * new BONES/DATA specialists. Does not fetch, approve or run agents.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "../src/knowledge/phase3-evidence-queue.mjs";
import {validateNextElevenSpecialistPublicPilot} from "../src/knowledge/phase3-next-eleven-specialist-public-pilot.mjs";
if(process.argv.length!==2)throw Error("No live, fetch, write, owner consent or deploy option supported");
const load=relative=>{
 const bytes=readFileSync(new URL(relative,import.meta.url));
 return {json:JSON.parse(bytes.toString("utf8")),
  blob:createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex")};
};
const roster=load("../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../docs/a0/roster-freeze-lock-2026-11-07.json").json;
if(roster.blob!==lock.snapshotGitBlobSha)throw Error("APPROVED_ROSTER_VERSION_MISMATCH");
const first=load("../docs/stage-b/b3-public-source-pilot-2026-11-08.json").json;
const second=load("../docs/stage-b/b3-public-source-expansion-2026-11-08.json").json;
const third=load("../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json").json;
const previous=load("../docs/stage-b/b3-first-eight-specialist-public-pilot-2026-11-08.json").json;
const current=load("../docs/stage-b/b3-next-eleven-specialist-public-pilot-2026-11-08.json").json;
const drafts=createPhase1BrainDrafts(roster.json,lock);
const dockets=createPhase3EvidenceQueue(drafts);
const result=validateNextElevenSpecialistPublicPilot(current,previous,roster.json,dockets,first,second,third);
process.stdout.write(JSON.stringify(result,null,2)+"\n");
