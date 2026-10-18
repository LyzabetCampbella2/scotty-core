import postgres from 'postgres';
let connection:any,initializing:Promise<void>|undefined;
export const missionDb=()=>connection||(connection=postgres(process.env.DATABASE_URL||'',{max:4,ssl:process.env.SCOTTY_BRAIN_DB_SSL==='disable'?false:'require'}));
// Shared by the existing HUD runner and its project-scoped review adapter.
export async function ensureMissionRecords(){
 if(!initializing)initializing=(async()=>{const q=missionDb();
  await q`create table if not exists scotty_agent_missions(id uuid primary key,task text not null,status text not null default 'completed',agents jsonb not null default '[]',briefing jsonb not null default '[]',results jsonb not null default '[]',review jsonb not null default '[]',progress jsonb not null default '[]',dependencies jsonb not null default '[]',unresolved jsonb not null default '[]',created_at timestamptz not null default now(),updated_at timestamptz not null default now())`;
  await q`alter table scotty_agent_missions add column if not exists parent_mission_id uuid`;
  await q`alter table scotty_agent_missions add column if not exists project_managed boolean not null default false`;
  await q`create table if not exists scotty_agent_plans(id uuid primary key,task text not null,agents jsonb not null,dependencies jsonb not null,briefing jsonb not null,status text not null default 'awaiting_approval',created_at timestamptz not null default now(),approved_at timestamptz)`;
  await q`alter table scotty_agent_plans add column if not exists project_managed boolean not null default false`;
 })().catch(e=>{initializing=undefined;throw e});return initializing;
}
