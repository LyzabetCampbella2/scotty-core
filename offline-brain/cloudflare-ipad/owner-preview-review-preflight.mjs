/**
 * Owner-only, isolated Worker launch preflight.
 * Data boundary: schema names, public agent ID memberships, and server-side
 * environment presence only. No private memories, prompts, secrets or tokens.
 * Checks do not authorize review decisions or mission execution.
 *
 * MUST be reached through worker.mjs owner bearer authentication.
 */
import {reviewLedgerReadiness} from './activepieces-review-readiness.mjs';
import {portfolioReadiness} from './agent-portfolio.mjs';
import {connectedRoster} from './connected-roster.mjs';

const publicIds=new Set(connectedRoster().map(a=>a.id));
const id=/^[a-z0-9][a-z0-9_-]{3,79}$/i;

function checkedAllowlist(raw){
 if(typeof raw!=='string'||raw.length>1600)return null;
 const entries=raw.split(',').map(x=>x.trim());
 if(entries.length<1||entries.length>20||new Set(entries).size!==entries.length||
    entries.some(x=>!id.test(x)))return null;
 return entries;
}

export async function inspectOwnerReviewPreflight(env){
 const switchOn=env?.SCOTTY_PREVIEW_REVIEWS_ENABLED==='true';
 const ownerConfigValid=typeof env?.SCOTTY_REVIEW_OWNER_ID==='string'&&
    id.test(env.SCOTTY_REVIEW_OWNER_ID);
 const allowed=checkedAllowlist(env?.SCOTTY_REVIEW_PROJECT_ALLOWLIST);
 const [ledger,portfolio]=await Promise.all([
   reviewLedgerReadiness(env?.BRAIN_DB),
   portfolioReadiness(env?.BRAIN_DB)
 ]);
 const reasons=[];
 if(!switchOn)reasons.push('OWNER_REVIEW_SWITCH_OFF');
 if(!ownerConfigValid||!allowed)reasons.push('OWNER_REVIEW_CONFIG_INVALID');
 if(!ledger.ready)reasons.push(ledger.reason||'REVIEW_LEDGER_NOT_READY');
 if(!portfolio.ready)reasons.push(portfolio.reason||'PROJECT_PORTFOLIO_NOT_READY');
 let projectMembershipReady=false,projectsConfigured=allowed?.length||0;
 let matchingProjectCount=0,linkedAgentCount=0;
 if(allowed&&portfolio.ready){
   // Identifiers are validated before they are interpolated into placeholders.
   // No project names, private notes or credentials are selected or returned.
   try{
     const placeholders=allowed.map(()=>'?').join(',');
     const result=await env.BRAIN_DB.prepare(
       'SELECT p.id AS project_id,l.agent_id AS agent_id FROM agent_projects p '+
       'LEFT JOIN agent_project_links l ON p.id=l.project_id '+
       'WHERE p.id IN ('+placeholders+') ORDER BY p.id,l.agent_id LIMIT 181'
     ).bind(...allowed).all();
     const records=result?.results;
     if(!Array.isArray(records)||records.length>160)throw Error('INVALID_MEMBERSHIP_ROWS');
     const byProject=new Map(allowed.map(x=>[x,new Set()]));
     for(const record of records){
       const s=byProject.get(record?.project_id);
       if(!s)throw Error('UNEXPECTED_PROJECT_LINK');
       if(record.agent_id!==null){
         if(!publicIds.has(record.agent_id)||s.has(record.agent_id))
           throw Error('UNVERIFIED_PUBLIC_AGENT_LINK');
         s.add(record.agent_id);
       }
     }
     matchingProjectCount=new Set(records.map(r=>r.project_id)).size;
     linkedAgentCount=[...byProject.values()].reduce((total,set)=>total+set.size,0);
     projectMembershipReady=matchingProjectCount===allowed.length&&
       [...byProject.values()].every(set=>set.size>0&&set.size<=8);
   }catch{
     reasons.push('PROJECT_MEMBERSHIP_QUERY_UNVERIFIED');
   }
   if(!projectMembershipReady&&!reasons.includes('PROJECT_MEMBERSHIP_QUERY_UNVERIFIED'))
     reasons.push('PROJECT_AGENT_MEMBERSHIP_NOT_READY');
 }
 const ready=switchOn&&ownerConfigValid&&Boolean(allowed)&&
   ledger.ready&&portfolio.ready&&projectMembershipReady;
 return {
   type:'SCOTTY_OWNER_PREVIEW_REVIEW_PREFLIGHT',
   status:ready?'ISOLATED_PREVIEW_REVIEW_CONFIG_READY':'BLOCKED',
   schemaVersion:ledger.schemaVersion,
   featureSwitchOn:switchOn,
   ownerConfigurationValid:ownerConfigValid,
   projectAllowlistValid:Boolean(allowed),
   reviewLedgerSchemaReady:ledger.ready,
   portfolioSchemaReady:portfolio.ready,
   projectsConfigured,
   matchingProjectCount,linkedAgentCount,
   publicDevelopmentMembershipReady:projectMembershipReady,
   readyForIsolatedPreviewReviews:ready,
   readyForProduction:false,
   liveAgentRosterVerified:false,
   ownerExecutionGrantVerified:false,
   privateMemoryAvailable:false,
   canExecute:false,canDeploy:false,canPublish:false,
   modelCalls:0,memoryReads:0,memoryWrites:0,databaseWrites:0,
   blockers:reasons,
   warning:'This is only an owner-authenticated configuration preflight. Do not treat it as permission to deploy or to start any mission.'
 };
}
