// Safe registry migration: preserves existing agent IDs, names and departments.
// Run only with a reviewed JSON export; never infer or invent agents.
import { readFile } from "node:fs/promises";
import { createBrain,getBrain } from "./store.ts";
type Legacy={id:string;name:string;department:string;specialty?:string;instructions?:string;knowledgeSources?:string[]};
const file=process.argv[2];
const apply=process.argv.includes("--apply");
if(apply&&process.env.SCOTTY_AGENT_IMPORT_CONFIRMED!=="yes")throw new Error("Set SCOTTY_AGENT_IMPORT_CONFIRMED=yes only after reviewing the dry run");
if(!file)throw new Error("Usage: bun run src/agents/registry-import.ts <reviewed-export.json> [--apply]");
const records:unknown=JSON.parse(await readFile(file,"utf8"));
if(!Array.isArray(records))throw new Error("Expected JSON array");
const seen=new Set<string>();
for(const r of records as Legacy[]){
 if(!r||typeof r.id!=="string"||!r.id.trim()||typeof r.name!=="string"||!r.name.trim()||typeof r.department!=="string"||!r.department.trim()||seen.has(r.id))throw new Error("Invalid or duplicate agent record");
 if(r.knowledgeSources!==undefined&&(!Array.isArray(r.knowledgeSources)||!r.knowledgeSources.every(x=>typeof x==="string")))throw new Error("Invalid knowledge sources for "+r.id);
 seen.add(r.id);
}
let created=0,existing=0;
for(const r of records as Legacy[]){
 if(!apply){console.log("DRY RUN",r.id,r.name,r.department);continue;}
 const prior=await getBrain(r.id);
 if(prior){existing++;if(prior.name!==r.name||prior.department!==r.department)throw new Error("Existing identity conflict: "+r.id);continue;}
 await createBrain({id:r.id,name:r.name,department:r.department,specialty:r.specialty??"Unassigned",instructions:r.instructions??"",knowledgeSources:r.knowledgeSources??[]});
 created++;
}
console.log(JSON.stringify({dryRun:!apply,total:records.length,created,existing}));
