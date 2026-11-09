#!/usr/bin/env node
/**
 * Read-only source-pilot evidence status export (no network/private data).
 * The manifest represents prior public-page inspection, not verification
 * by an independent reviewer, provider, signed owner or running agent.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "../src/knowledge/phase3-evidence-queue.mjs";
import {validatePublicSourcePilot} from "../src/knowledge/phase3-public-source-pilot.mjs";
if(process.argv.length!==2)throw Error("No write, deploy, fetch, approve or production command supported");
const read=(p)=>{
 const bytes=readFileSync(new URL(p,import.meta.url));
 return {json:JSON.parse(bytes.toString("utf8")),
  gitBlob:createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex")};
};
const frozen=read("../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../docs/a0/roster-freeze-lock-2026-11-07.json").json;
if(frozen.gitBlob!==lock.snapshotGitBlobSha)
 throw Error("APPROVED_FROZEN_ROSTER_MISMATCH");
const pilot=read("../docs/stage-b/b3-public-source-pilot-2026-11-08.json").json;
const drafts=createPhase1BrainDrafts(frozen.json,lock);
const queue=createPhase3EvidenceQueue(drafts);
const report=validatePublicSourcePilot(pilot,queue,frozen.json);
process.stdout.write(JSON.stringify(report,null,2)+"\n");
