import { timingSafeEqual, randomUUID } from "node:crypto";
import { ACTIONS, DATA_CLASSES } from "./approval-gate.mjs";

const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const id=v=>typeof v==="string"&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(v);
const scopeId=v=>typeof v==="string"&&(v===""||id(v));
const finiteMoney=v=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&Math.round(v*100)===v*100;
const UTC=v=>typeof v==="string"&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(v)&&Number.isFinite(Date.parse(v));
const EXACT=["agentId","taskId","projectId","resourceId","accountId","channelId","revision","toolId"];
function bearerMatches(presented, expected) {
 if(typeof presented!=="string"||typeof expected!=="string"||expected.length<48)return false;
 const buf=Buffer.from(presented),compare=Buffer.from(expected);
 return buf.length===compare.length&&timingSafeEqual(buf,compare);
}
async function objectBody(req) {
 if(!req.headers.get("content-type")?.toLowerCase().startsWith("application/json"))throw Error("content-type");
 if(Number(req.headers.get("content-length"))>16384)throw Error("body-too-large");
 const raw=await req.text();
 if(raw.length>16384)throw Error("body-too-large");
 const v=JSON.parse(raw);
 if(!v||Array.isArray(v)||typeof v!=="object")throw Error("invalid-body");
 return v;
}
function normalizeGrant(input,ownerId,now=new Date()) {
 if(!id(ownerId)||!input||typeof input!=="object")throw Error("invalid-owner");
 for(const key of EXACT)if(!scopeId(input[key]))throw Error("invalid-"+key);
 for(const key of ["agentId","taskId","projectId","resourceId","revision","toolId"])if(!id(input[key]))throw Error("required-"+key);
 if(!ACTIONS.includes(input.action)||!DATA_CLASSES.includes(input.dataClass))throw Error("invalid-action-or-class");
 if(typeof input.approvalEvidenceId!=="string"||!id(input.approvalEvidenceId))throw Error("approval-evidence-required");
 if(!UTC(input.expiresAt))throw Error("invalid-expiry");
 const issuedAt=now.toISOString(),expiryMs=Date.parse(input.expiresAt),issuedMs=now.getTime();
 if(expiryMs<=issuedMs||expiryMs-issuedMs>24*60*60*1000)throw Error("expiry-out-of-bounds");
 if(!finiteMoney(input.maxSpendUsd)||input.maxSpendUsd!==0)throw Error("stage-a0-zero-spend-only");
 if(["write-file","send-message","publish-public","deploy-change","spend-money","manage-credentials"].includes(input.action)&&!id(input.idempotencyKey))throw Error("idempotency-required");
 if(["send-message","publish-public","deploy-change","spend-money","manage-credentials"].includes(input.action)&&(!id(input.accountId)||!id(input.channelId)))throw Error("account-and-channel-required");
 return {grantId:randomUUID(),ownerId,issuedAt,expiresAt:input.expiresAt,
   approvalEvidenceId:input.approvalEvidenceId, maxSpendUsd:0, maxUses:1, usedCount:0,
   ownerApproved:true,status:"approved",revokedAt:null,
   idempotencyKey:input.idempotencyKey||"",action:input.action,dataClass:input.dataClass,
   ...Object.fromEntries(EXACT.map(k=>[k,input[k]]))};
}
function normalizeClaim(input) {
 if(!input||typeof input!=="object"||!id(input.grantId)||!ACTIONS.includes(input.action)||!DATA_CLASSES.includes(input.dataClass))throw Error("invalid-claim");
 for(const key of EXACT)if(!scopeId(input[key]))throw Error("invalid-"+key);
 for(const key of ["agentId","taskId","projectId","resourceId","revision","toolId"])if(!id(input[key]))throw Error("required-"+key);
 if(!id(input.idempotencyKey)||!finiteMoney(input.estimatedCostUsd)||input.estimatedCostUsd!==0)throw Error("invalid-claim-cost-or-idempotency");
 return {...Object.fromEntries(EXACT.map(k=>[k,input[k]])),grantId:input.grantId,action:input.action,dataClass:input.dataClass,idempotencyKey:input.idempotencyKey,estimatedCostUsd:0};
}
/**
 * Owner-only and staging-only HTTP surface. No agent/token access or tool execution.
 * Database injection is for tests; default store is loaded only after safe auth.
 */
export async function handleA0(req,url,options={}) {
 if(process.env.SCOTTY_A0_ENABLED!=="true"||process.env.SCOTTY_A0_ENV!=="staging")return json({ok:false,error:"Stage A0 ledger disabled"},503);
 const expected=process.env.SCOTTY_A0_ADMIN_TOKEN,ownerId=process.env.SCOTTY_A0_OWNER_ID;
 if(!expected||expected.length<48||!id(ownerId))return json({ok:false,error:"Stage A0 owner authentication not configured"},503);
 const auth=req.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer ")||!bearerMatches(auth.slice(7),expected))return json({ok:false,error:"Unauthorized"},401);
 const origin=req.headers.get("origin");
 if(origin&&origin!==url.origin)return json({ok:false,error:"Origin mismatch"},403);
 if(!["GET","POST"].includes(req.method))return json({ok:false,error:"Method not allowed"},405);
 if(req.method==="POST"&&req.headers.get("x-scotty-a0-csrf")!=="1")return json({ok:false,error:"Write confirmation header required"},403);
 if(req.method==="POST"&&req.headers.get("sec-fetch-site")==="cross-site")return json({ok:false,error:"Cross-site write denied"},403);
 try {
  const store=options.store ?? await (options.storeFactory?options.storeFactory():(await import("./a0-ledger.mjs")).openA0Store());
  const p=url.pathname;
  if(p==="/api/a0/status"&&req.method==="GET")return json({ok:true,status:await store.status()});
  if(p==="/api/a0/grants"&&req.method==="GET")return json({ok:true,grants:await store.listGrants()});
  if(p==="/api/a0/grants"&&req.method==="POST"){
   const input=await objectBody(req);
   if(input.ownerApproved!==true)return json({ok:false,error:"Explicit owner review required"},400);
   const grant=normalizeGrant(input,ownerId,options.now??new Date());
   return json({ok:true,grant:await store.createGrant(grant)},201);
  }
  const revoke=p.match(/^\/api\/a0\/grants\/([0-9a-fA-F-]{36})\/revoke$/);
  if(revoke&&req.method==="POST") {
   await objectBody(req);
   return json({ok:true,grant:await store.revokeGrant(revoke[1],ownerId)});
  }
  if(p==="/api/a0/stop-all"&&req.method==="POST"){
   await objectBody(req);
   return json({ok:true,status:await store.stopAll(ownerId)});
  }
  if(p==="/api/a0/claims"&&req.method==="POST"){
   // Test-only reservation receipt; no external action and no runtime delegation.
   if(process.env.SCOTTY_A0_CLAIM_TESTS_ENABLED!=="true")return json({ok:false,error:"Claims disabled"},503);
   const input=await objectBody(req);
   return json({ok:true,decision:await store.claim(normalizeClaim(input),ownerId,options.now??new Date())});
  }
  return json({ok:false,error:"Not found"},404);
 }catch(err) {
  const safe=err instanceof SyntaxError?"Invalid JSON":err instanceof Error&&/^(invalid-|required-|stage-a0-|expiry-|approval-|idempotency-|account-|content-type|body-too-large)/.test(err.message)?err.message:"Stage A0 request failed";
  return json({ok:false,error:safe},400);
 }
}
