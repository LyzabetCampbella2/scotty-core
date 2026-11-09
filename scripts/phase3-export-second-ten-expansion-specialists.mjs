#!/usr/bin/env node
/**
 * Read-only B3 public source review report for expansion specialists 011–020.
 * Only repository JSON; no HTTP request, external apps, model call, paid
 * provider, private client files, owner approval or agent activation.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "../src/knowledge/phase3-evidence-queue.mjs";
import {validateSecondTenExpansionSpecialists} from "../src/knowledge/phase3-second-ten-expansion-specialists.mjs";
if(process.argv.length!==2)throw Error("No approve, fetch, deploy, publish or live-agent option supported");
const read=p=>{
 const b=readFileSync(new URL(p,import.meta.url));
 return {json:JSON.parse(b.toString("utf8")),
  gitBlob:createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex")};
};
const roster=read("../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../docs/a0/roster-freeze-lock-2026-11-07.json").json;
if(roster.gitBlob!==lock.snapshotGitBlobSha)
 throw Error("OWNER_APPROVED_185_ID_ROSTER_HASH_MISMATCH");
const chief1=read("../docs/stage-b/b3-public-source-pilot-2026-11-08.json").json;
const chief2=read("../docs/stage-b/b3-public-source-expansion-2026-11-08.json").json;
const chief3=read("../docs/stage-b/b3-final-fifteen-chief-public-sources-2026-11-08.json").json;
const eight=read("../docs/stage-b/b3-first-eight-specialist-public-pilot-2026-11-08.json").json;
const eleven=read("../docs/stage-b/b3-next-eleven-specialist-public-pilot-2026-11-08.json").json;
const firstTen=read("../docs/stage-b/b3-next-ten-expansion-specialist-public-pilot-2026-11-08.json").json;
const secondTen=read("../docs/stage-b/b3-second-ten-expansion-specialist-public-pilot-2026-11-08.json").json;
const drafts=createPhase1BrainDrafts(roster.json,lock);
const queue=createPhase3EvidenceQueue(drafts);
const report=validateSecondTenExpansionSpecialists(secondTen,firstTen,eleven,eight,
 roster.json,queue,chief1,chief2,chief3);
process.stdout.write(JSON.stringify(report,null,2)+"\n");
