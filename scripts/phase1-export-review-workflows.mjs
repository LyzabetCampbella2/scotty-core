#!/usr/bin/env node
/**
 * B1 review-only export. Writes one JSON object to stdout; never requests
 * model access, touches databases, changes agents or grants owner approvals.
 *
 * node scripts/phase1-export-review-workflows.mjs queue
 * node scripts/phase1-export-review-workflows.mjs examples
 * node scripts/phase1-export-review-workflows.mjs rollback-requirements
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {makePhase1ReviewPackets} from "../src/agents/phase1/review-packets.mjs";
import {makeIndividualReviewQueue} from "../src/agents/phase1/individual-review-queue.mjs";
import {createSyntheticEvaluationComparisons} from "../src/agents/phase1/synthetic-comparisons.mjs";
import {ownerApprovalRequirementsForRelease} from "../src/agents/phase1/rollback-and-approval.mjs";

const mode=process.argv[2];
if(process.argv.length!==3||!["queue","examples","rollback-requirements"].includes(mode))
 throw Error("Usage: node scripts/phase1-export-review-workflows.mjs queue|examples|rollback-requirements");
function read(relative){
 const bytes=readFileSync(new URL(relative,import.meta.url));
 return {
  json:JSON.parse(bytes.toString("utf8")),
  gitBlobSha:createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex")
 };
}
const frozen=read("../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../docs/a0/roster-freeze-lock-2026-11-07.json").json;
if(frozen.gitBlobSha!==lock.snapshotGitBlobSha)throw Error("FROZEN_ROSTER_SHA_MISMATCH");
const drafts=createPhase1BrainDrafts(frozen.json,lock);
const packetSet=makePhase1ReviewPackets(drafts);
const obj=mode==="queue"?makeIndividualReviewQueue(packetSet):
 mode==="examples"?createSyntheticEvaluationComparisons(drafts):
 {
  schemaVersion:1,kind:"NOT_AN_APPROVAL_OR_RUNTIME_CONFIG",
  agentRequirements:packetSet.packets.map(ownerApprovalRequirementsForRelease),
  summary:{agentRequirements:185,actualOwnerApprovals:0,liveAgentActivations:0}
 };
process.stdout.write(JSON.stringify(obj,null,2)+"\n");
