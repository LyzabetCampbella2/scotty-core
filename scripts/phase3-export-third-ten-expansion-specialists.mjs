#!/usr/bin/env node
/**
 * SCOTTY B3 public-source review report for frozen specialists 021–030.
 * Reads tracked source metadata and exports to stdout only. No network
 * access, databases, production files, private accounts, owner grants,
 * automated model tests, payments, deployment, or real agent activity.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {createPhase3EvidenceQueue} from "../src/knowledge/phase3-evidence-queue.mjs";
import {validateThirdTenExpansionSpecialists} from "../src/knowledge/phase3-third-ten-expansion-specialists.mjs";
if(process.argv.length!==2)throw Error("No live, fetch, approve, deploy, payment or private-data argument");
const load=path=>{
 const bytes=readFileSync(new URL(path,import.meta.url));
 return {
  json:JSON.parse(bytes.toString("utf8")),
  blob:createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex")
 };
};
const frozen=load("../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../docs/a0/roster-freeze-lock-2026-11-07.json").json;
if(frozen.blob!==lock.snapshotGitBlobSha)
 throw Error("SCOTTY_FROZEN_185_AGENT_ROSTER_INTEGRITY_FAILURE");
const get=name=>load("../docs/stage-b/"+name).json;
const chief1=get("b3-public-source-pilot-2026-11-08.json");
const chief2=get("b3-public-source-expansion-2026-11-08.json");
const chief3=get("b3-final-fifteen-chief-public-sources-2026-11-08.json");
const eight=get("b3-first-eight-specialist-public-pilot-2026-11-08.json");
const eleven=get("b3-next-eleven-specialist-public-pilot-2026-11-08.json");
const ten1=get("b3-next-ten-expansion-specialist-public-pilot-2026-11-08.json");
const ten2=get("b3-second-ten-expansion-specialist-public-pilot-2026-11-08.json");
const ten3=get("b3-third-ten-expansion-specialist-public-pilot-2026-11-08.json");
const drafts=createPhase1BrainDrafts(frozen.json,lock);
const queue=createPhase3EvidenceQueue(drafts);
const result=validateThirdTenExpansionSpecialists(
 ten3,ten2,ten1,eleven,eight,frozen.json,queue,chief1,chief2,chief3
);
process.stdout.write(JSON.stringify(result,null,2)+"\n");
