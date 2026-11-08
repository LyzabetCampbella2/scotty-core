#!/usr/bin/env node
/**
 * B3 read-only review report for eight assistant-inspected public URLs.
 * No network request, real health data, model invocation, durable DB,
 * owner approval or live knowledge permissions. stdout only.
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "../src/knowledge/phase3-evidence-queue.mjs";
import {validateEightSpecialistSourcePilot} from "../src/knowledge/phase3-eight-specialist-public-pilot.mjs";
if(process.argv.length!==2)throw Error("No fetch, apply, publish, approve, private data or live options");
const read=path=>{
 const b=readFileSync(new URL(path,import.meta.url));
 return {json:JSON.parse(b.toString("utf8")),
  blob:createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex")};
};
const roster=read("../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../docs/a0/roster-freeze-lock-2026-11-07.json").json;
if(roster.blob!==lock.snapshotGitBlobSha)throw Error("FROZEN_AGENT_ROSTER_HASH_MISMATCH");
const first=read("../docs/stage-b/b3-public-source-pilot-2026-11-08.json").json;
const second=read("../docs/stage-b/b3-public-source-expansion-2026-11-08.json").json;
const third=read("../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json").json;
const specialist=read("../docs/stage-b/b3-first-eight-specialist-public-pilot-2026-11-08.json").json;
const drafts=createPhase1BrainDrafts(roster.json,lock);
const dockets=createPhase3EvidenceQueue(drafts);
const result=validateEightSpecialistSourcePilot(specialist,roster.json,dockets,first,second,third);
process.stdout.write(JSON.stringify(result,null,2)+"\n");
