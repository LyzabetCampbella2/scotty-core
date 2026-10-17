import postgres from "postgres";
import {canRead,newId,type Actor,type AgentBrain,type MemoryEntry,type LearningProposal} from "./brain.ts";

// Separate Phase 1 tables. Never rewrite the live scotty_agents registry.
let connection:ReturnType<typeof postgres>|undefined;
let initialized:Promise<void>|undefined;
function db(){if(!connection){const url=process.env.DATABASE_URL;if(!url)throw Error("DATABASE_URL is required");connection=postgres(url,{max:4,connect_timeout:12,idle_timeout:20,ssl:process.env.SCOTTY_BRAIN_DB_SSL==="disable"?false:"require"});}return connection;}
async function ensure(){
 if(!initialized)initialized=(async()=>{const q=db();
 await q`create table if not exists scotty_agent_brains(
 agent_id text primary key references scotty_agents(id) on delete restrict,
 specialty text not null default 'Unassigned',
 instructions text not null default '',
 knowledge_sources jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now())`;
 await q`create table if not exists scotty_brain_proposals(
 id uuid primary key,agent_id text not null references scotty_agents(id) on delete restrict,
 text text not null,source text not null,
 scope text not null check(scope in ('private','project','department','network')),
 project_id text,status text not null default 'pending' check(status in ('pending','approved','rejected')),
 submitted_at timestamptz not null default now(),reviewed_at timestamptz,reviewed_by text,
 check(scope<>'project' or project_id is not null))`;
 await q`create table if not exists scotty_brain_memories(
 id uuid primary key,proposal_id uuid unique references scotty_brain_proposals(id),
 agent_id text not null references scotty_agents(id) on delete restrict,
 text text not null,scope text not null check(scope in ('private','project','department','network')),
 project_id text,department text,source text,created_at timestamptz not null default now(),approved_by text not null,
 check(scope<>'project' or project_id is not null))`;
 await q`create index if not exists scotty_brain_memories_agent_idx on scotty_brain_memories(agent_id,created_at desc)`;
 await q`create index if not exists scotty_brain_proposals_status_idx on scotty_brain_proposals(status,submitted_at desc)`;
 })().catch(e=>{initialized=undefined;throw e});
 return initialized;
}
const iso=(v:unknown)=>v instanceof Date?v.toISOString():String(v);
function asBrain(r:any):AgentBrain{return {id:r.id,name:r.name,department:r.department,specialty:r.specialty||"Unassigned",instructions:r.instructions||"",knowledgeSources:r.knowledgeSources||[],createdAt:iso(r.createdAt)};}
function asProposal(r:any):LearningProposal{return {id:r.id,agentId:r.agentId,text:r.text,source:r.source,scope:r.scope,projectId:r.projectId||undefined,status:r.status,submittedAt:iso(r.submittedAt),reviewedAt:r.reviewedAt?iso(r.reviewedAt):undefined,reviewedBy:r.reviewedBy||undefined};}
function asMemory(r:any):MemoryEntry{return {id:r.id,agentId:r.agentId,text:r.text,scope:r.scope,projectId:r.projectId||undefined,department:r.department||undefined,source:r.source||undefined,createdAt:iso(r.createdAt),approvedBy:r.approvedBy};}
export async function listBrains(){await ensure();return (await db()`select a.id,a.name,a.department,b.specialty,b.instructions,b.knowledge_sources as "knowledgeSources",coalesce(b.created_at,a.updated_at) as "createdAt" from scotty_agents a left join scotty_agent_brains b on b.agent_id=a.id order by a.sort_order,a.name`).map(asBrain);}
export async function getBrain(id:string){await ensure();const rows=await db()`select a.id,a.name,a.department,b.specialty,b.instructions,b.knowledge_sources as "knowledgeSources",coalesce(b.created_at,a.updated_at) as "createdAt" from scotty_agents a left join scotty_agent_brains b on b.agent_id=a.id where a.id=${id} limit 1`;return rows[0]?asBrain(rows[0]):undefined;}
export async function createBrain(a:Omit<AgentBrain,"createdAt">){
 await ensure();const q=db();
 const existing=await q`select id from scotty_agents where id=${a.id}`;if(!existing.length)throw Error("Agent ID is not in the live roster");
 await q`insert into scotty_agent_brains(agent_id,specialty,instructions,knowledge_sources) values(${a.id},${a.specialty},${a.instructions},${q.json(a.knowledgeSources)}) on conflict(agent_id) do nothing`;
 return (await getBrain(a.id))!;
}
export async function listMemories(actor:Actor,agentId:string){await ensure();const rows=await db()`select id,agent_id as "agentId",text,scope,project_id as "projectId",department,source,created_at as "createdAt",approved_by as "approvedBy" from scotty_brain_memories where agent_id=${agentId} order by created_at desc limit 500`;return rows.map(asMemory).filter(x=>canRead(actor,x));}
export async function propose(agentId:string,input:Pick<LearningProposal,"text"|"source"|"scope"|"projectId">){
 await ensure();if(!await getBrain(agentId))throw Error("Unknown agent");if(input.scope==="external")throw Error("External sharing disabled");
 const id=newId(),q=db();
 const rows=await q`insert into scotty_brain_proposals(id,agent_id,text,source,scope,project_id) values(${id},${agentId},${input.text},${input.source},${input.scope},${input.projectId??null}) returning id,agent_id as "agentId",text,source,scope,project_id as "projectId",status,submitted_at as "submittedAt",reviewed_at as "reviewedAt",reviewed_by as "reviewedBy"`;
 return asProposal(rows[0]);
}
export async function listProposals(){await ensure();return (await db()`select id,agent_id as "agentId",text,source,scope,project_id as "projectId",status,submitted_at as "submittedAt",reviewed_at as "reviewedAt",reviewed_by as "reviewedBy" from scotty_brain_proposals order by submitted_at desc limit 500`).map(asProposal);}
export async function review(id:string,decision:"approved"|"rejected",reviewer:string){
 await ensure();const q=db();
 return q.begin(async tx=>{
 const rows=await tx`select p.*,a.department from scotty_brain_proposals p join scotty_agents a on a.id=p.agent_id where p.id::text=${id} for update of p`;
 const p=rows[0];if(!p||p.status!=="pending")throw Error("Proposal missing or already reviewed");
 await tx`update scotty_brain_proposals set status=${decision},reviewed_at=now(),reviewed_by=${reviewer} where id=${p.id}`;
 if(decision==="approved")await tx`insert into scotty_brain_memories(id,proposal_id,agent_id,text,scope,project_id,department,source,approved_by) values(${newId()},${p.id},${p.agent_id},${p.text},${p.scope},${p.project_id},${p.department},${p.source},${reviewer})`;
 const result=await tx`select id,agent_id as "agentId",text,source,scope,project_id as "projectId",status,submitted_at as "submittedAt",reviewed_at as "reviewedAt",reviewed_by as "reviewedBy" from scotty_brain_proposals where id=${p.id}`;
 return asProposal(result[0]);
 });
}
