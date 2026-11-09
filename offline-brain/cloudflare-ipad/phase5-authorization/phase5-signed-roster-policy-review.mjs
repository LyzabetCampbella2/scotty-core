/**
 * REVIEW-ONLY signed identity verifier for all 185 roster IDs.
 * No production session, app sign-in, agent runtime, database account,
 * external service, memory content, or authorization is created.
 */
import {createPublicKey,verify as verifySignature} from 'node:crypto';
import {createPhase5RosterMemoryPolicyReview} from './phase5-roster-memory-policy-review.mjs';

const ISSUER='scotty-p5-synthetic-roster-idp';
const AUDIENCE='scotty-p5-synthetic-roster-review';
const TOKEN_TYPE='SCOTTY-P5-SYNTHETIC-ROSTER-IDENTITY';
const PURPOSE='scotty-p5-roster-membership-review';
const KEY_ID=/^SYN-ROSTER-KEY-[A-Z0-9-]{1,80}$/;
const SESSION_ID=/^SYN-ROSTER-SESSION-[A-Z0-9-]{3,80}$/;
const CLAIMS=['iss','aud','sub','jti','iat','nbf','exp','version','purpose'];
const rejection=reason=>Object.freeze({
 decision:'DENY',reason,actualPermissionGranted:false,
 ownerApprovalVerified:false,canExecute:false,stagingOnly:true,
 memoryRowsReturned:0,externalCalls:0
});
function decodeBase64Url(text,maxBytes){
 if(typeof text!=='string'||!/^[A-Za-z0-9_-]+$/.test(text)||text.length>maxBytes*2)
  throw Error('INVALID_SYNTHETIC_TOKEN');
 const data=Buffer.from(text,'base64url');
 if(data.length>maxBytes||data.toString('base64url')!==text)throw Error('INVALID_SYNTHETIC_TOKEN');
 const obj=JSON.parse(data.toString('utf8'));
 if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('INVALID_SYNTHETIC_TOKEN');
 return obj;
}
const exactKeys=(obj,keys)=>Object.keys(obj).sort().join(',')===keys.slice().sort().join(',');
export function createPhase5SignedRosterScopeReview({
 snapshot,trustedKeys,isSessionRevoked,verifyReviewedRosterIdentity,
 now=()=>Date.now(),enabled=false
}={}){
 if(!trustedKeys||typeof trustedKeys!=='object'||Array.isArray(trustedKeys)||
    [isSessionRevoked,verifyReviewedRosterIdentity,now].some(x=>typeof x!=='function'))
  throw Error('TRUSTED_SYNTHETIC_ROSTER_DEPS_REQUIRED');
 const policy=createPhase5RosterMemoryPolicyReview(snapshot,{enabled:true});
 const publicKeys=new Map();
 for(const [id,entry] of Object.entries(trustedKeys)){
  if(!KEY_ID.test(id)||entry?.issuer!==ISSUER||entry?.active!==true||
     typeof entry.publicKeyPem!=='string')
    throw Error('INVALID_SYNTHETIC_ROSTER_KEY');
  const key=createPublicKey(entry.publicKeyPem);
  if(key.asymmetricKeyType!=='ed25519')throw Error('ED25519_PUBLIC_KEY_REQUIRED');
  publicKeys.set(id,key);
 }
 if(publicKeys.size===0)throw Error('TRUSTED_SYNTHETIC_ROSTER_DEPS_REQUIRED');
 const validIds=new Set(snapshot.agents.map(x=>x.id));
 return Object.freeze({
  review:async function review({request,ownerAgentId,scope,projectId,actorId}={}){
   if(!enabled)return rejection('SIGNED_ROSTER_REVIEW_DISABLED_BY_DEFAULT');
   try{
    if(typeof request?.headers?.get!=='function'||actorId!==undefined)throw Error('INVALID_INPUT');
    const auth=request.headers.get('authorization');
    if(typeof auth!=='string'||!auth.startsWith('Bearer ')||auth.length>5000)throw Error('INVALID_AUTH');
    const parts=auth.slice(7).split('.');
    if(parts.length!==3)throw Error('INVALID_TOKEN');
    const header=decodeBase64Url(parts[0],256);
    if(!exactKeys(header,['typ','alg','kid'])||header.typ!==TOKEN_TYPE||
       header.alg!=='EdDSA'||!KEY_ID.test(header.kid))throw Error('INVALID_HEADER');
    const key=publicKeys.get(header.kid);
    if(!key)throw Error('UNKNOWN_KEY');
    const claims=decodeBase64Url(parts[1],900);
    if(!exactKeys(claims,CLAIMS)||claims.iss!==ISSUER||claims.aud!==AUDIENCE||
       claims.purpose!==PURPOSE||claims.version!==1||!validIds.has(claims.sub)||
       !SESSION_ID.test(claims.jti)||![claims.iat,claims.nbf,claims.exp].every(Number.isSafeInteger))
      throw Error('INVALID_CLAIMS');
    const signature=Buffer.from(parts[2]||'','base64url');
    if(!/^[A-Za-z0-9_-]{86}$/.test(parts[2]||'')||
       signature.length!==64||signature.toString('base64url')!==parts[2]||
       !verifySignature(null,Buffer.from(parts[0]+'.'+parts[1]),key,signature))
      throw Error('INVALID_SIGNATURE');
    const ts=Math.floor(now()/1000);
    if(!Number.isSafeInteger(ts)||claims.iat>ts||claims.nbf>ts||
       claims.nbf<claims.iat||claims.exp<=ts||
       claims.exp<=claims.iat||claims.exp-claims.iat>600)
      throw Error('EXPIRED_OR_UNTRUSTED_CLOCK');
    const subject=Object.freeze({agentId:claims.sub,sessionId:claims.jti});
    if(await isSessionRevoked(subject)!==false||
       await verifyReviewedRosterIdentity(subject)!==true)
      throw Error('SESSION_INVALID');
    const proposed=policy.review({
       actorId:claims.sub,ownerAgentId,scope,projectId
    });
    if(proposed.actualPermissionGranted!==false)throw Error('UNSAFE_POLICY_RESULT');
    if(proposed.decision==='DENY')return rejection(proposed.reason);
    return Object.freeze({
     decision:'SIGNED_REVIEW_ONLY_PENDING_APPROVAL',
     agentId:claims.sub,scope,reason:proposed.reason,
     requiredApprovals:proposed.requiredApprovals,
     signedSyntheticIdentityVerified:true,ownerApprovalVerified:false,
     actualPermissionGranted:false,stagingOnly:true,
     canExecute:false,memoryRowsReturned:0,externalCalls:0
    });
   }catch{return rejection('SYNTHETIC_ROSTER_IDENTITY_UNVERIFIED')}
  }
 });
}
