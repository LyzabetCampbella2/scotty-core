#!/usr/bin/env node
// Read-only Phase B1 owner review packet export; no file/database/provider writes.
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {makePhase1ReviewPackets} from "../src/agents/phase1/review-packets.mjs";
const read=(path)=>{
 const bytes=readFileSync(new URL(path,import.meta.url));
 return {obj:JSON.parse(bytes.toString("utf8")),
  blob:createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex")};
};
if(process.argv.length>2)throw Error("No execution, deployment, apply or mutable parameters are permitted");
const frozen=read("../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../docs/a0/roster-freeze-lock-2026-11-07.json").obj;
if(frozen.blob!==lock.snapshotGitBlobSha)throw Error("FROZEN_ROSTER_SHA_MISMATCH");
const drafts=createPhase1BrainDrafts(frozen.obj,lock);
const packets=makePhase1ReviewPackets(drafts);
process.stdout.write(JSON.stringify(packets,null,2)+"\n");
