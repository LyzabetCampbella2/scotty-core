#!/usr/bin/env node
/**
 * SCOTTY phase 4 private localhost inference CLI.
 * NO production, Groq, Grok, deployment or automatic model downloads.
 */
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {openPrivateKnowledgeStore} from "./private-store.mjs";
import {createLocalReasoner} from "./local-reasoner.mjs";
import {createAgentInference} from "./agent-inference.mjs";
import {inspectInstalledLocalModel,localMachineSummary} from "./local-readiness.mjs";

const get=key=>{const i=process.argv.indexOf(key);return i<0?null:process.argv[i+1]??null;};
const has=key=>process.argv.includes(key);
const print=x=>process.stdout.write(JSON.stringify(x,null,2)+"\n");
async function syntheticDemo(){
 const root=await mkdtemp(join(tmpdir(),"scotty-private-knowledge-phase4-demo-"));
 try{
  const store=await openPrivateKnowledgeStore(root);
  await store.upsert({id:"synthetic-proof",title:"Synthetic source: verification",
    content:"ASTER-EXAMPLE is a fictional project code word for comparing expected and observed synthetic tests.",
    scope:"department",department:"Engineering & Systems",
    allowedAgentIds:["agent-geordi-01"],sourceType:"owner-file",
    citation:"Synthetic evaluation fixture, not factual world knowledge",
    reviewedAt:"2026-10-24",approved:true});
  let requests=0;
  const mockFetch=async (url,options)=>{
   requests++;
   if(url!=="http://127.0.0.1:11434/api/tags"&&url!=="http://127.0.0.1:11434/api/generate")throw Error("Unexpected network endpoint");
   return new Response(JSON.stringify(url.endsWith("tags")?
      {models:[{name:"synthetic-local:1b",model:"synthetic-local:1b",size:1234567890}]}:
      {done:true,response:"ASTER-EXAMPLE is a fictional test code word [Source 1]."}),{status:200});
  };
  const reasoner=createLocalReasoner({enabled:true,model:"synthetic-local:1b",fetcher:mockFetch});
  const runner=createAgentInference({store,reasoner});
  const answer=await runner.answer({agentId:"agent-geordi-01",question:"Explain ASTER-EXAMPLE",ownerApproved:true});
  if(requests!==2||answer.productionWrites!==0||answer.groqCalls!==0||answer.evaluation.citedSourceIds[0]!=="synthetic-proof")throw Error("Synthetic evaluation did not satisfy safety controls");
  print({result:"SYNTHETIC_LOCAL_MODEL_EVAL_PASS",simulatedModel:true,requests,model:answer.model,
    agentId:answer.agent.id,answer:answer.answer,evaluation:answer.evaluation,productionWrites:0,groqCalls:0,grokCalls:0});
 }finally{await rm(root,{recursive:true,force:true});}
}
async function main(){
 const cmd=process.argv[2];
 if(cmd==="hardware")return print(localMachineSummary());
 if(cmd==="synthetic-demo")return syntheticDemo();
 if(cmd==="readiness"){
  if(!has("--probe-local"))throw Error("Explicit --probe-local is required to check local Ollama");
  const model=get("--model");
  return print(await inspectInstalledLocalModel({enabled:true,model}));
 }
 const root=get("--root"),agentId=get("--agent"),question=get("--question");
 if(!root||!agentId||!question)throw Error("Use --root, --agent and --question for an owner-local preview/answer");
 const store=await openPrivateKnowledgeStore(root);
 if(cmd==="preview")return print(await createAgentInference({store}).preview({agentId,question}));
 if(cmd==="answer"){
  const model=get("--model");
  if(!model||!has("--enable-local-model")||!has("--owner-approved-local-inference"))throw Error("Explicit installed --model, --enable-local-model and --owner-approved-local-inference required");
  const runner=createAgentInference({store,reasoner:createLocalReasoner({enabled:true,model})});
  return print(await runner.answer({agentId,question,ownerApproved:true}));
 }
 throw Error("Commands: hardware, readiness, preview, answer, synthetic-demo");
}
main().catch(e=>{process.stderr.write("SCOTTY Phase 4: "+String(e?.message||e).slice(0,300)+"\n");process.exitCode=1;});
