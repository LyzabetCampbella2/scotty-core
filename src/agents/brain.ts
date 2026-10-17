export type Scope = "private" | "project" | "department" | "network" | "external";
export type ReviewStatus = "pending" | "approved" | "rejected";
export interface AgentBrain { id:string; name:string; department:string; specialty:string; instructions:string; knowledgeSources:string[]; createdAt:string; }
export interface MemoryEntry { id:string; agentId:string; text:string; scope:Scope; projectId?:string; department?:string; source?:string; createdAt:string; approvedBy:string; }
export interface LearningProposal { id:string; agentId:string; text:string; source:string; scope:Scope; projectId?:string; status:ReviewStatus; submittedAt:string; reviewedAt?:string; reviewedBy?:string; }
export interface Actor { id:string; role:"owner"|"agent"; department?:string; projectIds?:string[]; }
export function canRead(actor:Actor, entry:MemoryEntry):boolean {
 if(actor.role==="owner") return true;
 if(actor.id===entry.agentId) return true;
 if(entry.scope==="private"||entry.scope==="external") return false;
 if(entry.scope==="network") return true;
 if(entry.scope==="department") return !!actor.department && actor.department===entry.department;
 return entry.scope==="project" && !!entry.projectId && !!actor.projectIds?.includes(entry.projectId);
}
export function newId(){return crypto.randomUUID();}
