#!/usr/bin/env node
/**
 * A command-line demonstrator, NOT a live SCOTTY server.
 * Pure local input/output. No API, provider, secrets, live DB or backup reads.
 */
import {readFile} from "node:fs/promises";
import {createOfflineBrain} from "./engine.mjs";
const [command="demo",...args]=process.argv.slice(2);
const show=v=>process.stdout.write(JSON.stringify(v,null,2)+"\n");
async function main(){
 if(command==="catalog"){
  const b=createOfflineBrain();
  return show({status:"offline",agentCount:b.agentCount,chiefCount:b.chiefCount,departments:b.departments,
    agents:b.roster().map(a=>({id:a.id,specialty:a.specialty,department:a.department,chiefId:a.chiefId,synthetic:a.synthetic}))});
 }
 if(command==="demo"){
  const b=createOfflineBrain();
  return show({stats:{agents:b.agentCount,chiefs:b.chiefCount,knowledgeMethodPacks:b.documentCount},plan:b.plan("Evaluate a novel outline for pacing and character continuity",{maxAgents:3})});
 }
 if(command==="query"){
  const [question,agentId="agent-zora-01"]=args;
  if(!question)throw new Error("Supply a question as the first argument");
  const b=createOfflineBrain();
  return show(b.search(agentId,question));
 }
 if(command==="approved-json"){
  const [file,question,agentId="agent-zora-01",projectId=""]=args;
  if(!file||!file.endsWith(".json")||!question)throw new Error("Usage: approved-json OWNER_APPROVED.json 'question' [agentId] [projectId]");
  const source=JSON.parse(await readFile(file,"utf8"));
  if(!Array.isArray(source))throw new Error("File must be an array of explicitly approved source records");
  const b=createOfflineBrain({documents:source});
  return show(b.search(agentId,question,{projectId:projectId||null,authorizedProjectIds:projectId?[projectId]:[]}));
 }
 throw new Error("Available commands: demo, catalog, query, approved-json");
}
main().catch(e=>{process.stderr.write("Offline brain error: "+e.message+"\n");process.exitCode=1;});
