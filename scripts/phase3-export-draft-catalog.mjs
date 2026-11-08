#!/usr/bin/env node
/**
 * Read-only Stage B3 internal draft pack export, stdout only.
 * No external source fetching, index DB, project data or owner approval.
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {createPhase1BrainDrafts} from "../src/agents/phase1/draft-builder.mjs";
import {createPhase3DraftCatalog} from "../src/knowledge/phase3-draft-catalog.mjs";
if(process.argv.length!==2)throw Error("No deploy, write, external-source or live-agent options supported");
const load=relative=>{
 const bytes=readFileSync(new URL(relative,import.meta.url));
 return {body:JSON.parse(bytes.toString("utf8")),
  blob:createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex")};
};
const frozen=load("../docs/a0/roster-frozen-2026-11-07.json");
const lock=load("../docs/a0/roster-freeze-lock-2026-11-07.json").body;
if(frozen.blob!==lock.snapshotGitBlobSha)throw Error("OWNER_APPROVED_ROSTER_SHA_MISMATCH");
const drafts=createPhase1BrainDrafts(frozen.body,lock);
const catalog=createPhase3DraftCatalog(drafts);
process.stdout.write(JSON.stringify(catalog,null,2)+"\n");
