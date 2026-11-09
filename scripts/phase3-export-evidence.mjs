#!/usr/bin/env node
/**
 * Offline, read-only B3 knowledge evidence and QA export.
 * No network, DB, private files, apps, model calls, owner authorization,
 * professional citation verification or agent activation.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {
 createPhase3EvidenceQueue,runPhase3OfflineRetrievalChecks
} from "../src/knowledge/phase3-evidence-queue.mjs";
import {buildSyntheticCitationQASuite} from "../src/knowledge/phase3-citation-fixtures.mjs";

const mode=process.argv[2];
if(process.argv.length!==3||!["queue","retrieval","synthetic-citations"].includes(mode))
 throw Error("Usage: node scripts/phase3-export-evidence.mjs queue|retrieval|synthetic-citations");
const load=p=>{
 const data=readFileSync(new URL(p,import.meta.url));
 return {json:JSON.parse(data.toString("utf8")),
  blob:createHash("sha1").update("blob "+data.length+"\0").update(data).digest("hex")};
};
const frozen=load("../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../docs/a0/roster-freeze-lock-2026-11-07.json").json;
if(frozen.blob!==lock.snapshotGitBlobSha)
 throw Error("FROZEN_AGENT_ROSTER_MISMATCH");
const drafts=createPhase1BrainDrafts(frozen.json,lock);
const output=mode==="retrieval"?runPhase3OfflineRetrievalChecks(drafts):
 mode==="queue"?createPhase3EvidenceQueue(drafts):
 buildSyntheticCitationQASuite(createPhase3EvidenceQueue(drafts));
process.stdout.write(JSON.stringify(output,null,2)+"\n");
