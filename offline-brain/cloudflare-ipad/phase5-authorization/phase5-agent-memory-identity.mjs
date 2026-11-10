/**
 * SCOTTY Phase 5: SYNTHETIC agent-session -> dedicated PostgreSQL login boundary.
 * Unconnected. No server route imports this file. No real agent memory access.
 * This returns only memory ID fixture previews and never grants permissions.
 * All trust anchors, account/project status, and DB clients must be injected
 * independently by trusted server-side infrastructure (NOT request fields).
 */
import {createPublicKey, verify as verifySignature} from 'node:crypto';

const DB='scotty_phase5_synthetic_test';
const ISSUER='scotty-p5-synthetic-agent-idp';
const AUDIENCE='scotty-p5-synthetic-memory-preview';
const TYPE='SCOTTY-P5-SYNTHETIC-AGENT';
const SCOPE='individual';
const ACTION='synthetic-memory:preview';
const ALLOWED_IDENTITIES=new Set(['agent-creative-pulse','agent-creative-iris']);
const PROJECTS=new Set(['synthetic','SYN-PROJECT-OTHER']);
const SESSION=/^SYN-AGENT-SESSION-[A-Z0-9-]{3,80}$/;
const KEY=/^SYN-AGENT-KEY-[A-Z0-9-]{3,80}$/;
const LOGIN=/^scotty_p5_agent_[a-z_]{2,60}$/;
const SAFE_ID=/^SYN-MEM-[A-Z0-9-]{1,100}$/;
const SESSION_FIELDS=['iss','aud','sub','projectId','scope','purpose','jti','iat','nbf','exp','version'];
const fail=()=>Error('SYNTHETIC_AGENT_IDENTITY_REJECTED');

function segment(raw,maxSize){
 if(typeof raw!=='string'||!raw||raw.length>maxSize*2||!/^[A-Za-z0-9_-]+$/.test(raw))throw fail();
 const bytes=Buffer.from(raw,'base64url');
 if(bytes.length>maxSize||bytes.toString('base64url')!==raw)throw fail();
 const obj=JSON.parse(bytes.toString('utf8'));
 if(!obj||typeof obj!=='object'||Array.isArray(obj))throw fail();
 return obj;
}
const exact=(value,fields)=>Object.keys(value).sort().join(',')===fields.slice().sort().join(',');
const keyOf=(agent,project)=>agent+'|'+project;

export function createPhase5SyntheticAgentMemoryPreview({
 trustedKeys,dbBindings,verifyActiveAgentMembership,isAgentSessionRevoked,
 now=()=>Date.now(),enabled=false
}={}){
 if(!trustedKeys||typeof trustedKeys!=='object'||Array.isArray(trustedKeys)||
    !Array.isArray(dbBindings)||dbBindings.length!==3||
    [verifyActiveAgentMembership,isAgentSessionRevoked,now].some(fn=>typeof fn!=='function'))
   throw Error('TRUSTED_SYNTHETIC_AGENT_DEPENDENCIES_REQUIRED');
 const trust=new Map();
 for(const [kid,record] of Object.entries(trustedKeys)){
   if(!KEY.test(kid)||record?.issuer!==ISSUER||record?.active!==true||
      typeof record?.publicKeyPem!=='string')throw Error('INVALID_SYNTHETIC_AGENT_PUBLIC_KEY');
   const pub=createPublicKey(record.publicKeyPem);
   if(pub.asymmetricKeyType!=='ed25519')throw Error('ED25519_AGENT_SIGNING_KEY_REQUIRED');
   trust.set(kid,pub);
 }
 if(!trust.size)throw Error('TRUSTED_SYNTHETIC_AGENT_DEPENDENCIES_REQUIRED');
 const bindings=new Map();
 for(const row of dbBindings){
   if(!ALLOWED_IDENTITIES.has(row?.agentId)||!PROJECTS.has(row?.projectId)||
      !LOGIN.test(row?.login)||typeof row?.sql?.unsafe!=='function'||
      bindings.has(keyOf(row.agentId,row.projectId)))throw Error('INVALID_SYNTHETIC_DB_BINDING');
   bindings.set(keyOf(row.agentId,row.projectId),Object.freeze({...row}));
 }
 const expected=[
   ['agent-creative-pulse','synthetic','scotty_p5_agent_pulse'],
   ['agent-creative-iris','synthetic','scotty_p5_agent_iris'],
   ['agent-creative-pulse','SYN-PROJECT-OTHER','scotty_p5_agent_pulse_other']
 ];
 for(const [agent,project,login] of expected){
   if(bindings.get(keyOf(agent,project))?.login!==login)
     throw Error('INVALID_SYNTHETIC_DB_BINDING');
 }
 return async function preview({request,action=ACTION,projectId,agentId,scope=SCOPE}={}){
   if(!enabled)return Object.freeze({decision:'DENY',reason:'PHASE5_MEMORY_IDENTITY_DISABLED',actualPermissionGranted:false});
   try{
     if(action!==ACTION||scope!==SCOPE||typeof request?.headers?.get!=='function')throw fail();
     const bearer=request.headers.get('authorization');
     if(typeof bearer!=='string'||bearer.length>5000||!bearer.startsWith('Bearer '))throw fail();
     const parts=bearer.slice(7).split('.');
     if(parts.length!==3)throw fail();
     const header=segment(parts[0],300);
     if(!exact(header,['alg','typ','kid'])||header.alg!=='EdDSA'||header.typ!==TYPE||!KEY.test(header.kid))throw fail();
     const pub=trust.get(header.kid);
     const payload=segment(parts[1],900);
     const signature=Buffer.from(parts[2],'base64url');
     if(!pub||!/^[A-Za-z0-9_-]{86}$/.test(parts[2])||signature.length!==64||
        signature.toString('base64url')!==parts[2]||
        !verifySignature(null,Buffer.from(parts[0]+'.'+parts[1]),pub,signature))throw fail();
     if(!exact(payload,SESSION_FIELDS)||payload.iss!==ISSUER||payload.aud!==AUDIENCE||
        payload.purpose!==ACTION||payload.version!==1||payload.scope!==SCOPE||
        !ALLOWED_IDENTITIES.has(payload.sub)||!PROJECTS.has(payload.projectId)||
        !SESSION.test(payload.jti)||![payload.iat,payload.nbf,payload.exp].every(Number.isSafeInteger))throw fail();
     const nowSec=Math.floor(now()/1000);
     if(!Number.isSafeInteger(nowSec)||payload.iat>nowSec||payload.nbf>nowSec||
        payload.nbf<payload.iat||payload.exp<=nowSec||payload.exp<=payload.iat||
        payload.exp-payload.iat>600)throw fail();
     // The client cannot choose a different agent/project than its signed session.
     if((agentId!==undefined&&agentId!==payload.sub)||
        (projectId!==undefined&&projectId!==payload.projectId))throw fail();
     const identity=Object.freeze({agentId:payload.sub,projectId:payload.projectId,sessionId:payload.jti});
     if(await isAgentSessionRevoked(identity)!==false||
        await verifyActiveAgentMembership(identity)!==true)throw fail();
     const selected=bindings.get(keyOf(identity.agentId,identity.projectId));
     if(!selected)throw fail();
     // Verify the actual server-managed pool's DB identity before reading anything.
     const who=await selected.sql.unsafe('select current_database() as db, current_user as login, session_user as session');
     if(!Array.isArray(who)||who.length!==1||who[0].db!==DB||
        who[0].login!==selected.login||who[0].session!==selected.login)throw fail();
     const rows=await selected.sql.unsafe(
       'select memory_id from public.scotty_p5_synthetic_memory_items where project_id=$1 and owner_agent_id=$2 and memory_scope=\'individual\' and data_class=\'synthetic-only\' order by memory_id',
       [identity.projectId,identity.agentId]);
     if(!Array.isArray(rows)||rows.length>50||
        rows.some(r=>!SAFE_ID.test(r?.memory_id)))throw fail();
     return Object.freeze({
       decision:'SIMULATED_MEMORY_METADATA',actualPermissionGranted:false,
       stagingOnly:true,identityVerifiedInSyntheticTest:true,
       agentId:identity.agentId,projectId:identity.projectId,
       memoryIds:Object.freeze(rows.map(r=>r.memory_id)),
       memoryReadsExecutedOnlyAgainstDisposableFixtures:true,
       memoryWrites:0,externalCalls:0
     });
   }catch{
     return Object.freeze({decision:'DENY',reason:'SYNTHETIC_AGENT_IDENTITY_REJECTED',
       actualPermissionGranted:false,stagingOnly:true});
   }
 };
}
