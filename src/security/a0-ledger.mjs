import { randomUUID } from "node:crypto";
import { evaluateApprovalGate } from "./approval-gate.mjs";
let storeInstance;
export async function openA0Store() {
  if(process.env.SCOTTY_A0_ENABLED!=="true" || process.env.SCOTTY_A0_ENV!=="staging") throw Error("A0 staging disabled");
  const url=process.env.SCOTTY_A0_STAGING_DATABASE_URL, expected=process.env.SCOTTY_A0_STAGING_DATABASE_NAME;
  if(!url || !expected || !/^[a-zA-Z0-9_-]{1,63}$/.test(expected) || (process.env.DATABASE_URL && url===process.env.DATABASE_URL)) throw Error("Dedicated staging database required");
  if(!storeInstance){
    const {default:postgres}=await import("postgres");
    const sql=postgres(url,{max:3,connect_timeout:10,idle_timeout:15,ssl:"require"});
    storeInstance=initializeA0(sql,expected).catch(async e=>{storeInstance=undefined;await sql.end({timeout:1}).catch(()=>{});throw e;});
  }
  return storeInstance;
}
async function initializeA0(sql,expected) {
  const found=await sql`select current_database() as name`;
  if(found[0]?.name!==expected) throw Error("Unexpected A0 database");
  await sql`create table if not exists scotty_a0_control(
    id smallint primary key check(id=1), stop_all boolean not null default true,
    enabled boolean not null default false, budget_approved boolean not null default false,
    paid_actions_enabled boolean not null default false,
    task_cap_cents bigint not null default 0 check(task_cap_cents>=0),
    daily_cap_cents bigint not null default 0 check(daily_cap_cents>=0),
    max_retries integer not null default 0 check(max_retries>=0),
    max_concurrent integer not null default 1 check(max_concurrent>=0),
    active_runs integer not null default 0 check(active_runs>=0),
    updated_at timestamptz not null default now()
  )`;
  await sql`insert into scotty_a0_control(id) values(1) on conflict do nothing`;
  await sql`create table if not exists scotty_a0_grant(
    grant_id uuid primary key, owner_id text not null, agent_id text not null,
    project_id text not null, task_id text not null, action text not null,
    resource_id text not null, account_id text not null, channel_id text not null,
    revision text not null, tool_id text not null, data_class text not null,
    idempotency_key text not null, approval_evidence_id text not null,
    issued_at timestamptz not null, expires_at timestamptz not null,
    status text not null default 'approved' check(status in ('approved','revoked')),
    revoked_at timestamptz, used_count integer not null default 0 check(used_count in (0,1)),
    max_spend_cents bigint not null default 0 check(max_spend_cents=0),
    check(expires_at>issued_at and expires_at<=issued_at+interval '24 hours')
  )`;
  await sql`create index if not exists scotty_a0_grant_scope_idx on scotty_a0_grant(project_id,task_id,issued_at desc)`;
  await sql`create table if not exists scotty_a0_claim(
    claim_id uuid primary key, grant_id uuid not null references scotty_a0_grant(grant_id),
    request_key text not null unique, project_id text not null, task_id text not null,
    cost_cents bigint not null default 0 check(cost_cents=0),
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists scotty_a0_audit(
    event_id uuid primary key, at timestamptz not null default now(),
    event_type text not null, actor_id text not null,
    grant_id uuid, project_id text, task_id text, result text not null,
    evidence_id text
  )`;
  const audited=async(tx,eventType,actorId,grantId,projectId,taskId,result,evidenceId)=>{
    await tx`insert into scotty_a0_audit(
      event_id,event_type,actor_id,grant_id,project_id,task_id,result,evidence_id
    ) values(${randomUUID()},${eventType},${actorId},${grantId??null},${projectId??null},${taskId??null},${result},${evidenceId??null})`;
  };
  const view=row=>({
    grantId:row.grant_id,ownerId:row.owner_id,agentId:row.agent_id,
    projectId:row.project_id,taskId:row.task_id,action:row.action,
    resourceId:row.resource_id,accountId:row.account_id,channelId:row.channel_id,
    revision:row.revision,toolId:row.tool_id,dataClass:row.data_class,
    idempotencyKey:row.idempotency_key,approvalEvidenceId:row.approval_evidence_id,
    issuedAt:new Date(row.issued_at).toISOString(),expiresAt:new Date(row.expires_at).toISOString(),
    revokedAt:row.revoked_at?new Date(row.revoked_at).toISOString():null,
    status:row.status,ownerApproved:true,maxUses:1,usedCount:row.used_count,maxSpendUsd:0
  });
  return {
    async status(){
      const [c]=await sql`select stop_all,enabled,budget_approved,paid_actions_enabled,task_cap_cents,daily_cap_cents from scotty_a0_control where id=1`;
      const [n]=await sql`select (select count(*)::int from scotty_a0_grant) as grants,(select count(*)::int from scotty_a0_claim) as claims`;
      return {environment:"staging",stopAll:c.stop_all,enabled:c.enabled,budgetApproved:c.budget_approved,
        paidActionsEnabled:c.paid_actions_enabled,taskCapUsd:Number(c.task_cap_cents)/100,
        dailyCapUsd:Number(c.daily_cap_cents)/100,grantCount:n.grants,claimCount:n.claims,externalExecutionEnabled:false};
    },
    async listGrants(){return (await sql`select * from scotty_a0_grant order by issued_at desc limit 100`).map(view);},
    async createGrant(g){
      return sql.begin(async tx=>{
        const [control]=await tx`select id from scotty_a0_control where id=1 for update`;
        if(!control)throw Error("A0 control missing");
        const [row]=await tx`insert into scotty_a0_grant(
          grant_id,owner_id,agent_id,project_id,task_id,action,resource_id,
          account_id,channel_id,revision,tool_id,data_class,idempotency_key,
          approval_evidence_id,issued_at,expires_at
        ) values(${g.grantId},${g.ownerId},${g.agentId},${g.projectId},${g.taskId},
          ${g.action},${g.resourceId},${g.accountId},${g.channelId},${g.revision},
          ${g.toolId},${g.dataClass},${g.idempotencyKey},${g.approvalEvidenceId},
          ${g.issuedAt},${g.expiresAt}) returning *`;
        await audited(tx,"grant-created",g.ownerId,g.grantId,g.projectId,g.taskId,"record-only",g.approvalEvidenceId);
        return view(row);
      });
    },
    async revokeGrant(grantId,ownerId){
      return sql.begin(async tx=>{
        await tx`select id from scotty_a0_control where id=1 for update`;
        const [row]=await tx`select * from scotty_a0_grant where grant_id=${grantId} for update`;
        if(!row||row.owner_id!==ownerId)throw Error("Grant missing");
        await tx`update scotty_a0_grant set status='revoked',revoked_at=coalesce(revoked_at,now()) where grant_id=${grantId}`;
        await audited(tx,"grant-revoked",ownerId,grantId,row.project_id,row.task_id,"revoked",row.approval_evidence_id);
        const [updated]=await tx`select * from scotty_a0_grant where grant_id=${grantId}`;
        return view(updated);
      });
    },
    async stopAll(ownerId){
      return sql.begin(async tx=>{
        const [row]=await tx`update scotty_a0_control set stop_all=true,enabled=false,updated_at=now() where id=1 returning stop_all,enabled`;
        if(!row)throw Error("A0 stop-all unavailable");
        await audited(tx,"stop-all",ownerId,null,null,null,"new-claims-blocked",null);
        return {stopAll:true,enabled:false,externalExecutionEnabled:false};
      });
    },
    async claim(request,ownerId,now=new Date()){
      try {
        return await sql.begin(async tx=>{
          // Serialize stop-all, grant consumption and claims behind one control row.
          const [c]=await tx`select * from scotty_a0_control where id=1 for update`;
          if(!c)throw Error("A0 control missing");
          const [g]=await tx`select * from scotty_a0_grant where grant_id=${request.grantId} for update`;
          if(!g||g.owner_id!==ownerId)return {permitted:false,reason:"invalid-owner-or-grant"};
          const [previous]=await tx`select claim_id from scotty_a0_claim where request_key=${request.idempotencyKey}`;
          if(previous)return {permitted:false,reason:"duplicate-request"};
          const decision=evaluateApprovalGate(request,view(g),{
            stopAll:c.stop_all,enabled:c.enabled,grantLedgerAvailable:true,auditAvailable:true,
            environment:"staging",productionReleaseApproved:false,now:now.toISOString(),
            retryCount:0,maxRetries:c.max_retries,activeRuns:c.active_runs,maxConcurrent:c.max_concurrent,
            budgetApproved:c.budget_approved,paidActionsEnabled:c.paid_actions_enabled,
            taskCapUsd:Number(c.task_cap_cents)/100,dailyCapUsd:Number(c.daily_cap_cents)/100,
            taskSpentUsd:0,dailySpentUsd:0
          });
          if(!decision.permitted){
            await audited(tx,"claim-denied",ownerId,g.grant_id,g.project_id,g.task_id,decision.reason,g.approval_evidence_id);
            return {permitted:false,reason:decision.reason};
          }
          if(request.estimatedCostUsd!==0)return {permitted:false,reason:"A0-zero-spend-only"};
          await tx`update scotty_a0_grant set used_count=1 where grant_id=${g.grant_id} and used_count=0`;
          const claimId=randomUUID();
          await tx`insert into scotty_a0_claim(claim_id,grant_id,request_key,project_id,task_id) values(
            ${claimId},${g.grant_id},${request.idempotencyKey},${g.project_id},${g.task_id}
          )`;
          await audited(tx,"claim-reserved",ownerId,g.grant_id,g.project_id,g.task_id,"staging-only-no-execution",g.approval_evidence_id);
          return {permitted:true,reason:"staging-reservation-only",claimId,externalActionExecuted:false};
        });
      }catch{
        return {permitted:false,reason:"atomic-ledger-error"};
      }
    }
  };
}
