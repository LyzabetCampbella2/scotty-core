import postgres from "postgres";

// Scoped service identities for future agent runtimes; never share these
// credentials with a browser or include them in application logs.
let client:any, initialized:Promise<void>|undefined;
const db=()=>client||(client=postgres(process.env.DATABASE_URL||"",{ssl:process.env.SCOTTY_BRAIN_DB_SSL==="disable"?false:"require",max:3,connect_timeout:12}));
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
async function digest(token:string){return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))));}
export async function ensureAgentCredentials(){
 if(!initialized)initialized=(async()=>{const q=db();
  await q`create table if not exists scotty_collab_credentials(
   token_hash text primary key,
   agent_id text not null references scotty_agents(id) on delete restrict,
   project_id text not null,
   created_at timestamptz not null default now(),
   expires_at timestamptz not null,
   revoked_at timestamptz,
   created_by text not null default 'owner')`;
  await q`create index if not exists scotty_collab_credentials_agent_idx on scotty_collab_credentials(agent_id,project_id)`;
 })().catch(e=>{initialized=undefined;throw e});
 return initialized;
}
export async function issueAgentCredential(agentId:string,projectId:string,ttlMinutes=60){
 await ensureAgentCredentials();
 if(!Number.isInteger(ttlMinutes)||ttlMinutes<5||ttlMinutes>1440)throw Error("Invalid credential lifetime");
 const q=db();
 const granted=await q`select 1 from scotty_collab_grants where project_id=${projectId} and agent_id=${agentId}`;
 if(!granted.length)throw Error("Agent does not have the requested project grant");
 const raw="scotty_agent_"+hex(crypto.getRandomValues(new Uint8Array(32)));
 await q`insert into scotty_collab_credentials(token_hash,agent_id,project_id,expires_at)
 values(${await digest(raw)},${agentId},${projectId},now()+(${ttlMinutes} * interval '1 minute'))`;
 return {credential:raw,agentId,projectId,expiresInMinutes:ttlMinutes};
}
export async function authenticateAgent(req:Request,projectId:string){
 await ensureAgentCredentials();
 const auth=req.headers.get("authorization")||"";
 if(!/^Bearer scotty_agent_[0-9a-f]{64}$/.test(auth))return null;
 const token=auth.slice(7),h=await digest(token);
 const rows=await db()`select c.agent_id as "agentId",c.project_id as "projectId"
 from scotty_collab_credentials c join scotty_collab_grants g
 on g.agent_id=c.agent_id and g.project_id=c.project_id
 where c.token_hash=${h} and c.project_id=${projectId}
 and c.revoked_at is null and c.expires_at>now() limit 1`;
 return rows[0]||null;
}
export async function revokeAgentCredentials(agentId:string,projectId:string){
 await ensureAgentCredentials();
 const result=await db()`update scotty_collab_credentials set revoked_at=now()
 where agent_id=${agentId} and project_id=${projectId} and revoked_at is null returning token_hash`;
 return {revoked:result.length};
}
