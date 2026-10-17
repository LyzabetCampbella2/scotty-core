import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname,join } from "node:path";
import { type AgentBrain,type MemoryEntry,type LearningProposal,newId,canRead,type Actor } from "./brain.ts";

let db:Database|undefined;
function database():Database {
 if(db)return db;
 const dir=process.env.SCOTTY_BRAIN_DATA_DIR;
 if(!dir)throw new Error("SCOTTY_BRAIN_DATA_DIR is required for persistent brain storage");
 mkdirSync(dir,{recursive:true,mode:0o700});
 const instance=new Database(join(dir,"agent-brains.sqlite"),{create:true,strict:true});
 instance.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
 instance.exec(`
 CREATE TABLE IF NOT EXISTS agents(id TEXT PRIMARY KEY,name TEXT NOT NULL,department TEXT NOT NULL,specialty TEXT NOT NULL,instructions TEXT NOT NULL,knowledge_sources TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY,agent_id TEXT NOT NULL REFERENCES agents(id),text TEXT NOT NULL,source TEXT NOT NULL,scope TEXT NOT NULL CHECK(scope IN ('private','project','department','network')),project_id TEXT,status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),submitted_at TEXT NOT NULL,reviewed_at TEXT,reviewed_by TEXT);
 CREATE TABLE IF NOT EXISTS memories(id TEXT PRIMARY KEY,agent_id TEXT NOT NULL REFERENCES agents(id),text TEXT NOT NULL,scope TEXT NOT NULL CHECK(scope IN ('private','project','department','network')),project_id TEXT,department TEXT,source TEXT,created_at TEXT NOT NULL,approved_by TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS memories_agent_idx ON memories(agent_id);
 CREATE INDEX IF NOT EXISTS proposals_status_idx ON proposals(status);
 `);
 db=instance;return instance;
}
type AgentRow={id:string;name:string;department:string;specialty:string;instructions:string;knowledge_sources:string;created_at:string};
type ProposalRow={id:string;agent_id:string;text:string;source:string;scope:LearningProposal["scope"];project_id:string|null;status:LearningProposal["status"];submitted_at:string;reviewed_at:string|null;reviewed_by:string|null};
type MemoryRow={id:string;agent_id:string;text:string;scope:MemoryEntry["scope"];project_id:string|null;department:string|null;source:string|null;created_at:string;approved_by:string};
function agent(r:AgentRow):AgentBrain{return {id:r.id,name:r.name,department:r.department,specialty:r.specialty,instructions:r.instructions,knowledgeSources:JSON.parse(r.knowledge_sources),createdAt:r.created_at};}
function proposal(r:ProposalRow):LearningProposal{return {id:r.id,agentId:r.agent_id,text:r.text,source:r.source,scope:r.scope,projectId:r.project_id??undefined,status:r.status,submittedAt:r.submitted_at,reviewedAt:r.reviewed_at??undefined,reviewedBy:r.reviewed_by??undefined};}
function memory(r:MemoryRow):MemoryEntry{return {id:r.id,agentId:r.agent_id,text:r.text,scope:r.scope,projectId:r.project_id??undefined,department:r.department??undefined,source:r.source??undefined,createdAt:r.created_at,approvedBy:r.approved_by};}
export async function listBrains(){return database().query("SELECT * FROM agents ORDER BY created_at").all().map(r=>agent(r as AgentRow));}
export async function getBrain(id:string){const r=database().query("SELECT * FROM agents WHERE id=?").get(id);return r?agent(r as AgentRow):undefined;}
export async function createBrain(a:Omit<AgentBrain,"createdAt">){const v={...a,createdAt:new Date().toISOString()};database().query("INSERT INTO agents VALUES (?,?,?,?,?,?,?)").run(v.id,v.name,v.department,v.specialty,v.instructions,JSON.stringify(v.knowledgeSources),v.createdAt);return v;}
export async function listMemories(actor:Actor,agentId:string){return database().query("SELECT * FROM memories WHERE agent_id=? ORDER BY created_at DESC").all(agentId).map(r=>memory(r as MemoryRow)).filter(m=>canRead(actor,m));}
export async function propose(agentId:string,input:Pick<LearningProposal,"text"|"source"|"scope"|"projectId">){if(!await getBrain(agentId))throw new Error("Unknown agent");if(input.scope==="external")throw new Error("External memory disabled");const p:LearningProposal={...input,id:newId(),agentId,status:"pending",submittedAt:new Date().toISOString()};database().query("INSERT INTO proposals(id,agent_id,text,source,scope,project_id,status,submitted_at) VALUES (?,?,?,?,?,?,?,?)").run(p.id,p.agentId,p.text,p.source,p.scope,p.projectId??null,p.status,p.submittedAt);return p;}
export async function listProposals(){return database().query("SELECT * FROM proposals ORDER BY submitted_at DESC").all().map(r=>proposal(r as ProposalRow));}
export async function review(id:string,decision:"approved"|"rejected",reviewer:string){
 const d=database();return d.transaction(()=>{
  const raw=d.query("SELECT * FROM proposals WHERE id=?").get(id) as ProposalRow|null;
  if(!raw||raw.status!=="pending")throw new Error("Proposal missing or already reviewed");
  const now=new Date().toISOString();
  d.query("UPDATE proposals SET status=?,reviewed_at=?,reviewed_by=? WHERE id=? AND status='pending'").run(decision,now,reviewer,id);
  if(decision==="approved"){
   const a=d.query("SELECT department FROM agents WHERE id=?").get(raw.agent_id) as {department:string};
   d.query("INSERT INTO memories(id,agent_id,text,scope,project_id,department,source,created_at,approved_by) VALUES (?,?,?,?,?,?,?,?,?)").run(newId(),raw.agent_id,raw.text,raw.scope,raw.project_id,a.department,raw.source,now,reviewer);
  }
  return proposal({...raw,status:decision,reviewed_at:now,reviewed_by:reviewer});
 })();
}
