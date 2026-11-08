#!/usr/bin/env node
/**
 * Read-only: generate 185 unapproved baseline revision summaries to stdout.
 * Does not create a workflow, edit GitHub, run agents or authenticate an owner.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {makePhase1ReviewPackets} from "../src/agents/phase1/review-packets.mjs";
import {beginDraftRevisionJournal,draftRevisionSummary} from "../src/agents/phase1/revision-journal.mjs";

if(process.argv.length!==2)throw Error("No apply, execution, or other arguments supported");
function read(path){
 const bytes=readFileSync(new URL(path,import.meta.url));
 return {json:JSON.parse(bytes.toString("utf8")),blob:createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex")};
}
const roster=read("../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../docs/a0/roster-freeze-lock-2026-11-07.json").json;
if(roster.blob!==lock.snapshotGitBlobSha)throw Error("Approved roster version changed");
const drafts=createPhase1BrainDrafts(roster.json,lock);
const review=makePhase1ReviewPackets(drafts);
const summaries=review.packets.map(packet=>draftRevisionSummary(beginDraftRevisionJournal(packet)));
const result={
 schemaVersion:1,stage:"B",phase:1,
 sourceRosterBlobSha:lock.snapshotGitBlobSha,
 status:"BASELINE_OFFLINE_REVIEW_ONLY",
 profiles:summaries,
 summary:{profiles:summaries.length,unapproved:summaries.filter(r=>!r.ownerApproved).length,
   realModelEvaluations:0,externalActions:0}
};
if(summaries.length!==185)throw Error("185_APPROVED_IDENTITIES_REQUIRED");
process.stdout.write(JSON.stringify(result,null,2)+"\n");
