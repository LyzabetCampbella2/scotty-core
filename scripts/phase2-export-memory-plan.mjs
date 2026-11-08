#!/usr/bin/env node
/**
 * Phase B2 read-only architecture export. Synthetic identities/metadata only.
 * Does not create memory tables, ingest owner data, connect a provider or
 * install a retrieval/permission endpoint.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {buildMemoryBlueprints} from "../src/memory/phase2-policy.mjs";
if(process.argv.length!==2)throw Error("No live apply, write, deploy or production access supported");
const read=(p)=>{
 const bytes=readFileSync(new URL(p,import.meta.url));
 return {body:JSON.parse(bytes.toString("utf8")),
  gitBlobSha:createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex")};
};
const frozen=read("../docs/a0/roster-frozen-2026-11-07.json");
const lock=read("../docs/a0/roster-freeze-lock-2026-11-07.json").body;
if(frozen.gitBlobSha!==lock.snapshotGitBlobSha)
 throw Error("A0_APPROVED_IDENTITY_HASH_MISMATCH");
const blueprint=buildMemoryBlueprints(frozen.body,lock.snapshotGitBlobSha);
process.stdout.write(JSON.stringify(blueprint,null,2)+"\n");
