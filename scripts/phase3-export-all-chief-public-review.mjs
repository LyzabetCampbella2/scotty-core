#!/usr/bin/env node
/**
 * Read-only report for all 25 unapproved chief public-source candidates.
 * Reads only frozen development JSON; no external source content/network,
 * owner authentication, production data, paid providers, DB, or activation.
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "../src/knowledge/phase3-evidence-queue.mjs";
import {validateCompleteChiefPublicReview} from "../src/knowledge/phase3-all-chief-public-review.mjs";
import {buildSpecialistSourceResearchQueue} from "../src/knowledge/phase3-specialist-research-backlog.mjs";
const mode=process.argv[2]??"chiefs";
if(process.argv.length>3||!["chiefs","specialists"].includes(mode))
 throw Error("Usage: phase3-export-all-chief-public-review.mjs [chiefs|specialists]");
const read=path=>{
 const bytes=readFileSync(new URL(path,import.meta.url));
 return {json:JSON.parse(bytes.toString("utf8")),
  gitBlob:createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex")};
};
const roster=read("../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../docs/a0/roster-freeze-lock-2026-11-07.json").json;
if(roster.gitBlob!==lock.snapshotGitBlobSha)throw Error("B3_FROZEN_ROSTER_CHANGED");
const first=read("../docs/stage-b/b3-public-source-pilot-2026-11-08.json").json;
const second=read("../docs/stage-b/b3-public-source-expansion-2026-11-08.json").json;
const third=read("../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json").json;
const drafts=createPhase1BrainDrafts(roster.json,lock);
const queue=createPhase3EvidenceQueue(drafts);
const result=validateCompleteChiefPublicReview(third,roster.json,queue,first,second);
const output=mode==="specialists"?buildSpecialistSourceResearchQueue(roster.json,queue,first,second,third):result;
process.stdout.write(JSON.stringify(output,null,2)+"\n");
