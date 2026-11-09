/**
 * SCOTTY Phase 5: synthetic signed owner-session boundary, no routes or production use.
 * Ed25519 keys are supplied from an independent TEST trust store, never from the token,
 * browser-supplied roles, grant rows, or project headers. No sign-in is performed here.
 */
import {createPublicKey,verify as cryptoVerify} from 'node:crypto';

const KEY=/^SYN-SESSION-KEY-[A-Z0-9-]{3,80}$/;
const SUBJECT=/^SYN-OWNER-[A-Z0-9-]{3,80}$/;
const SESSION=/^SYN-SESSION-[A-Z0-9-]{3,80}$/;
const PROJECT=/^(?:synthetic|SYN-PROJECT-[A-Z0-9-]{1,80})$/;
const ISSUER='scotty-p5-synthetic-idp';
const AUDIENCE='scotty-p5-synthetic-preview';
const PURPOSE='synthetic-owner-preview';
const HEADER_TYPE='SCOTTY-P5-SYNTHETIC-SESSION';
const ALLOWED_ACTIONS=Object.freeze(['workspace:read','knowledge:propose']);
const bad=()=>Error('SYNTHETIC_OWNER_SESSION_REJECTED');
function parseSegment(value,maxBytes) {
 if(typeof value!=='string'||value.length>maxBytes*2||!/^[A-Za-z0-9_-]+$/.test(value))throw bad();
 const decoded=Buffer.from(value,'base64url');
 if(decoded.length>maxBytes||decoded.toString('base64url')!==value)throw bad();
 const obj=JSON.parse(decoded.toString('utf8'));
 if(!obj||typeof obj!=='object'||Array.isArray(obj))throw bad();
 return obj;
}
function exactKeys(obj,expected) {
 return Object.keys(obj).sort().join(',')===expected.slice().sort().join(',');
}
export function createPhase5SyntheticOwnerSessionResolver({
 trustedKeys,loadProjectMembershipForSubject,isSessionRevoked,
 now=()=>Date.now(),enabled=false,
}={}){
 if(!trustedKeys||typeof trustedKeys!=='object'||Array.isArray(trustedKeys)||
    [loadProjectMembershipForSubject,isSessionRevoked,now].some(fn=>typeof fn!=='function'))
  throw Error('INDEPENDENT_SESSION_TRUST_REQUIRED');
 const keys=new Map();
 for(const [kid,record] of Object.entries(trustedKeys)) {
  if(!KEY.test(kid)||record?.issuer!==ISSUER||record?.active!==true||
     typeof record.publicKeyPem!=='string')throw Error('INVALID_TEST_SESSION_TRUST_KEY');
  const key=createPublicKey(record.publicKeyPem);
  if(key.asymmetricKeyType!=='ed25519')throw Error('ED25519_SESSION_PUBLIC_KEY_REQUIRED');
  keys.set(kid,key);
 }
 if(keys.size===0)throw Error('INDEPENDENT_SESSION_TRUST_REQUIRED');
 return async function resolveSignedSyntheticOwnerContext(request) {
  if(!enabled)throw Error('PHASE5_SESSION_DISABLED');
  try{
   if(!request||typeof request.headers?.get!=='function')throw bad();
   const authorization=request.headers.get('authorization');
   if(typeof authorization!=='string'||authorization.length>5000||
      !authorization.startsWith('Bearer '))throw bad();
   const parts=authorization.slice(7).split('.');
   if(parts.length!==3)throw bad();
   const header=parseSegment(parts[0],300);
   if(!exactKeys(header,['alg','typ','kid'])||header.alg!=='EdDSA'||
      header.typ!==HEADER_TYPE||!KEY.test(header.kid))throw bad();
   const key=keys.get(header.kid);
   if(!key)throw bad();
   const payload=parseSegment(parts[1],800);
   const signature=Buffer.from(parts[2],'base64url');
   if(!/^[A-Za-z0-9_-]{86}$/.test(parts[2])||signature.length!==64||
      signature.toString('base64url')!==parts[2]||
      !cryptoVerify(null,Buffer.from(parts[0]+'.'+parts[1]),key,signature))throw bad();
   if(!exactKeys(payload,['iss','aud','sub','jti','iat','nbf','exp','version','purpose'])||
      payload.iss!==ISSUER||payload.aud!==AUDIENCE||payload.purpose!==PURPOSE||
      payload.version!==1||!SUBJECT.test(payload.sub)||!SESSION.test(payload.jti)||
      ![payload.iat,payload.nbf,payload.exp].every(Number.isSafeInteger))throw bad();
   const nowSeconds=Math.floor(now()/1000);
   if(!Number.isSafeInteger(nowSeconds)||payload.iat>nowSeconds||
      payload.nbf>nowSeconds||payload.exp<=nowSeconds||
      payload.exp<=payload.iat||payload.exp-payload.iat>600||
      payload.nbf<payload.iat)throw bad();
   const identity=Object.freeze({subject:payload.sub,sessionId:payload.jti});
   const revoked=await isSessionRevoked(identity);
   if(revoked!==false)throw bad();
   const membership=await loadProjectMembershipForSubject(identity);
   if(!Array.isArray(membership)||membership.length<1||membership.length>30||
      membership.some(p=>typeof p!=='string'||!PROJECT.test(p)))throw bad();
   const projects=Object.freeze([...new Set(membership)]);
   const permissionMap=Object.fromEntries(projects.map(p=>[p,Object.freeze([...ALLOWED_ACTIONS])]));
   return Object.freeze({
    verifiedByServer:true,subject:'owner',principalId:payload.sub,
    sessionId:payload.jti,roles:Object.freeze(['owner']),
    permissions:Object.freeze(permissionMap),authorizedProjectIds:projects,
    sessionExpiresAt:payload.exp*1000,stagingOnly:true,
   });
  }catch{throw bad()}
 };
}
