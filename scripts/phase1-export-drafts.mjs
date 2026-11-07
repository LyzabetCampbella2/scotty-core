#!/usr/bin/env node
// Stage B1 owner-review draft export. READ-ONLY: prints JSON to stdout.
// Never connects to the agent runtime, writes a database or contacts providers.
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";

const load=(path)=>{
 const bytes=readFileSync(new URL(path,import.meta.url));
 const blob=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
 return {obj:JSON.parse(bytes.toString("utf8")),blob};
};
const roster=load("../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../docs/a0/roster-freeze-lock-2026-11-07.json").obj;
if(roster.blob!==lock.snapshotGitBlobSha)throw Error("Refusing Phase B draft export: frozen roster changed");
const drafts=createPhase1BrainDrafts(roster.obj,lock);
if(process.argv.includes("--apply")||process.argv.includes("--deploy"))throw Error("Stage B draft export does not support writes or activation");
process.stdout.write(JSON.stringify(drafts,null,2)+"\n");
