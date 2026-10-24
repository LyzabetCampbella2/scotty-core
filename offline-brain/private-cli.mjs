#!/usr/bin/env node
// Private local developer CLI; never connects to production, Groq or xAI.
import {readFile} from "node:fs/promises";
import {openPrivateKnowledgeStore} from "./private-store.mjs";
import {createLocalReasoner} from "./local-reasoner.mjs";
function opt(k){const i=process.argv.indexOf(k);return i<0?null:process.argv[i+1]??null;}
const flag=k=>process.argv.includes(k);
const show=value=>process.stdout.write(JSON.stringify(value,null,2)+"\n");
async function main(){
 const cmd=process.argv[2],root=opt("--root");
 if(!root)throw Error("An explicit --root /absolute/path/scotty-private-knowledge directory is required.");
 const store=await openPrivateKnowledgeStore(root);
 if(cmd==="status")return show(await store.status());
 if(cmd==="import-reviewed"){
  const file=opt("--file"),expected=Number(opt("--expected-revision")??"0");
  if(!file||!file.endsWith(".json")||!Number.isSafeInteger(expected)||expected<0)throw Error("Provide an owner-reviewed JSON file and --expected-revision");
  const doc=JSON.parse(await readFile(file,"utf8"));
  return show(await store.upsert(doc,{expectedRevision:expected,reviewedBy:"owner"}));
 }
 if(cmd==="search"){
  const agent=opt("--agent"),question=opt("--question"),projectId=opt("--project");
  if(!agent||!question)throw Error("Provide --agent and --question");
  return show(await store.search(agent,question,projectId?{projectId,authorizedProjectIds:[projectId]}:{}));
 }
 if(cmd==="plan"){
  const question=opt("--question"),projectId=opt("--project");
  if(!question)throw Error("Provide --question");
  return show(await store.createRetrievalPlan(question,projectId?{projectId,authorizedProjectIds:[projectId]}:{}));
 }
 if(cmd==="ask-local"){
  const agent=opt("--agent"),question=opt("--question"),model=opt("--model"),projectId=opt("--project");
  if(!agent||!question||!model||!flag("--enable-local-model"))throw Error("Explicit --agent --question --model and --enable-local-model required");
  const found=await store.search(agent,question,projectId?{projectId,authorizedProjectIds:[projectId]}:{});
  const reasoner=createLocalReasoner({enabled:true,model});
  return show(await reasoner.ask({agentId:agent,question,evidence:found.results,allowLocalKnowledgeAccess:flag("--allow-local-evidence")}));
 }
 throw Error("Commands: status, import-reviewed, search, plan, ask-local");
}
main().catch(e=>{process.stderr.write("Independent brain: "+String(e.message).slice(0,300)+"\n");process.exitCode=1;});
