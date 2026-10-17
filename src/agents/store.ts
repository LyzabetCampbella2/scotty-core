import { type AgentBrain,type MemoryEntry,type LearningProposal,newId,canRead,type Actor } from "./brain.ts";
import { mkdir,readFile,writeFile,rename } from "node:fs/promises";
import { join } from "node:path";
type Data={agents:AgentBrain[]; memories:MemoryEntry[]; proposals:LearningProposal[]};
const base=process.env.SCOTTY_BRAIN_DATA_DIR;
if(!base) console.warn("SCOTTY_BRAIN_DATA_DIR is unset; agent-brain writes are disabled.");
const path=base?join(base,"brains.json"):"";
let queue=Promise.resolve();
async function load():Promise<Data>{
 if(!base) throw new Error("Persistent brain storage is not configured");
 try{return JSON.parse(await readFile(path,"utf8")) as Data;}catch(e:any){if(e.code==="ENOENT")return {agents:[],memories:[],proposals:[]};throw e;}
}
async function transaction<T>(fn:(data:Data)=>T|Promise<T>):Promise<T>{
 const task=queue.then(async()=>{const data=await load();const result=await fn(data);await mkdir(base!,{recursive:true});const temp=path+"."+newId()+".tmp";await writeFile(temp,JSON.stringify(data,null,2),{mode:0o600});await rename(temp,path);return result;});
 queue=task.then(()=>{},()=>{});return task;
}
export async function listBrains(){return (await load()).agents;}
export async function getBrain(id:string){return (await load()).agents.find(a=>a.id===id);}
export async function createBrain(a:Omit<AgentBrain,"createdAt">){return transaction(d=>{if(d.agents.some(x=>x.id===a.id))throw new Error("Agent already exists");const v={...a,createdAt:new Date().toISOString()};d.agents.push(v);return v;});}
export async function listMemories(actor:Actor,agentId:string){const d=await load();return d.memories.filter(m=>m.agentId===agentId&&canRead(actor,m));}
export async function propose(agentId:string,input:Pick<LearningProposal,"text"|"source"|"scope"|"projectId">){return transaction(d=>{if(!d.agents.some(a=>a.id===agentId))throw new Error("Unknown agent");const p:LearningProposal={...input,id:newId(),agentId,status:"pending",submittedAt:new Date().toISOString()};d.proposals.push(p);return p;});}
export async function listProposals(){return (await load()).proposals;}
export async function review(id:string,decision:"approved"|"rejected",reviewer:string){return transaction(d=>{const p=d.proposals.find(x=>x.id===id);if(!p||p.status!=="pending")throw new Error("Proposal missing or already reviewed");p.status=decision;p.reviewedAt=new Date().toISOString();p.reviewedBy=reviewer;if(decision==="approved"){const agent=d.agents.find(x=>x.id===p.agentId)!;d.memories.push({id:newId(),agentId:p.agentId,text:p.text,scope:p.scope,projectId:p.projectId,department:agent.department,source:p.source,createdAt:p.reviewedAt,approvedBy:reviewer});}return p;});}
