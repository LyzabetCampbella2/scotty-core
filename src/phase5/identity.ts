/** Phase 5 staging-only OIDC-style JWT verification.
 * No remote JWKS fetch, token minting, cookie fallback, or owner-role trust.
 * Configure a pinned RSA public key and exact issuer/audience/owner subject.
 * Real identity-provider registration and environment isolation require owner review.
 */
import { createPublicKey, verify } from 'node:crypto';

type Json = Record<string, unknown>;
export type IdentityConfig = {issuer:string; audience:string; ownerSubject:string; publicKeyPem:string; keyId:string};
export class IdentityDenied extends Error {constructor(){super('identity_denied');}}
function dict(v:unknown):v is Json {return Boolean(v)&&typeof v==='object'&&!Array.isArray(v);}
function b64url(input:string):Buffer {
  if(!input || input.length>8192 || !/^[A-Za-z0-9_-]+$/.test(input) || input.length%4===1) throw new IdentityDenied();
  const out=Buffer.from(input,'base64url');
  if(out.toString('base64url')!==input)throw new IdentityDenied();
  return out;
}
function parsed(buffer:Buffer):Json {
  let obj:unknown;try{obj=JSON.parse(buffer.toString('utf8'));}catch{throw new IdentityDenied();}
  if(!dict(obj))throw new IdentityDenied();return obj;
}
const int=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
export function requireOwnerJwt(authorization:string|null,config:IdentityConfig,now=Math.floor(Date.now()/1000)):string {
  if(!config.issuer||!config.audience||!config.ownerSubject||!config.publicKeyPem||!config.keyId) throw new IdentityDenied();
  if(!authorization||!authorization.startsWith('Bearer ')||authorization.length>12000)throw new IdentityDenied();
  const raw=authorization.slice(7), segments=raw.split('.');
  if(segments.length!==3)throw new IdentityDenied();
  const [h,p,s]=segments;
  const head=parsed(b64url(h)),claims=parsed(b64url(p));
  if(Object.keys(head).some(k=>!['alg','kid','typ'].includes(k)))throw new IdentityDenied();
  if(head.alg!=='RS256'||head.typ!=='JWT'||head.kid!==config.keyId)throw new IdentityDenied();
  if(claims.iss!==config.issuer||claims.aud!==config.audience||claims.sub!==config.ownerSubject)throw new IdentityDenied();
  if(!int(claims.exp)||!int(claims.iat)||!int(claims.nbf)||!int(now)||
     claims.iat>now+15||claims.nbf>now+15||claims.exp<=now-15||claims.exp<claims.iat||
     claims.exp-claims.iat>300||claims.iat<now-315)throw new IdentityDenied();
  if(typeof claims.jti!=='string'||!/^[a-zA-Z0-9_-]{16,128}$/.test(claims.jti))throw new IdentityDenied();
  try{
    const key=createPublicKey(config.publicKeyPem);
    if(key.asymmetricKeyType!=='rsa'||(key.asymmetricKeyDetails?.modulusLength??0)<2048)throw new IdentityDenied();
    if(!verify('RSA-SHA256',Buffer.from(h+'.'+p),key,b64url(s)))throw new IdentityDenied();
  }catch{throw new IdentityDenied();}
  return config.ownerSubject;
}
