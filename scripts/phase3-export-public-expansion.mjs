#!/usr/bin/env node
/**
 * Offline B3 ten-chief public reference REVIEW export, no source retrieval.
 * The manifests report assistant inspection; neither verification by
 * independent humans nor owner approval is implied by this JSON output.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "../src/knowledge/phase3-evidence-queue.mjs";
import {validatePublicSourceExpansion} from "../src/knowledge/phase3-public-source-expansion.mjs";
if(process.argv.length!==2)throw Error("No apply, approve, fetch or deploy commands supported");
const read=path=>{
 const bytes=readFileSync(new URL(path,import.meta.url));
 return {json:JSON.parse(bytes.toString("utf8")),
  blob:createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex")};
};
const frozen=read("../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../docs/a0/roster-freeze-lock-2026-11-07.json").json;
if(frozen.blob!==lock.snapshotGitBlobSha)throw Error("FROZEN_ROSTER_INTEGRITY_FAILURE");
const originals=read("../docs/stage-b/b3-public-source-pilot-2026-11-08.json").json;
const expansion=read("../docs/stage-b/b3-public-source-expansion-2026-11-08.json").json;
const drafts=createPhase1BrainDrafts(frozen.json,lock);
const queue=createPhase3EvidenceQueue(drafts);
const report=validatePublicSourceExpansion(expansion,originals,queue,frozen.json);
process.stdout.write(JSON.stringify(report,null,2)+"\n");
