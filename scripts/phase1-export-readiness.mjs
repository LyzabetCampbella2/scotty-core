#!/usr/bin/env node
// Read-only, no-network Stage B1 export of pending knowledge/evaluation evidence.
// Usage: node scripts/phase1-export-readiness.mjs knowledge|evaluations
// No remote access, execution, approval, deployment or memory modification.
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {createAllKnowledgeDossiers} from "../src/agents/phase1/knowledge-dossiers.mjs";
import {buildEvaluationMatrix} from "../src/agents/phase1/evaluation-matrix.mjs";

const mode=process.argv[2];
if(process.argv.length!==3||!["knowledge","evaluations"].includes(mode))
 throw Error("Usage: node scripts/phase1-export-readiness.mjs knowledge|evaluations; execution is not supported");
function open(relative){
 const bytes=readFileSync(new URL(relative,import.meta.url));
 return {json:JSON.parse(bytes.toString("utf8")),blob:createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex")};
}
const frozen=open("../docs/a0/roster-frozen-2026-11-07.json");
const lock=open("../docs/a0/roster-freeze-lock-2026-11-07.json").json;
if(frozen.blob!==lock.snapshotGitBlobSha)throw Error("FROZEN_ROSTER_VERSION_MISMATCH");
const drafts=createPhase1BrainDrafts(frozen.json,lock);
const value=mode==="knowledge"?createAllKnowledgeDossiers(drafts):buildEvaluationMatrix(drafts);
process.stdout.write(JSON.stringify(value,null,2)+"\n");
