import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {requireOwnerJwt,IdentityDenied,type IdentityConfig} from './identity.ts';
import {handlePhase5,type Phase5PreviewLoader} from './index.ts';

const pair=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
const now=Math.floor(Date.now()/1000);
const cfg:IdentityConfig={issuer:'https://staging-idp.example',audience:'scotty-phase5-staging',ownerSubject:'owner-test-sub',publicKeyPem:pair.publicKey,keyId:'staging-key-1'};
const base={iss:cfg.issuer,aud:cfg.audience,sub:cfg.ownerSubject,iat:now-5,nbf:now-5,exp:now+180,jti:'unique_nonce_123456789'};
const enc=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
function token(claim:Record<string,unknown>={},head:Record<string,unknown>={}){
 const h=enc({alg:'RS256',typ:'JWT',kid:cfg.keyId,...head});const p=enc({...base,...claim});
 const s=sign('RSA-SHA256',Buffer.from(h+'.'+p),pair.privateKey).toString('base64url');return h+'.'+p+'.'+s;
}
const keys=['SCOTTY_ENV','SCOTTY_PHASE5_STAGING_ENABLED','SCOTTY_PHASE5_READ_ONLY','SCOTTY_PHASE5_OIDC_ISSUER','SCOTTY_PHASE5_OIDC_AUDIENCE','SCOTTY_PHASE5_OWNER_SUB','SCOTTY_PHASE5_OIDC_PUBLIC_KEY_PEM','SCOTTY_PHASE5_OIDC_KID'];
async function withEnv(f:()=>Promise<void>){
 const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{SCOTTY_ENV:'staging',SCOTTY_PHASE5_STAGING_ENABLED:'true',SCOTTY_PHASE5_READ_ONLY:'true',SCOTTY_PHASE5_OIDC_ISSUER:cfg.issuer,SCOTTY_PHASE5_OIDC_AUDIENCE:cfg.audience,SCOTTY_PHASE5_OWNER_SUB:cfg.ownerSubject,SCOTTY_PHASE5_OIDC_PUBLIC_KEY_PEM:cfg.publicKeyPem,SCOTTY_PHASE5_OIDC_KID:cfg.keyId});
 try{await f()}finally{for(const k of keys){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
}
function req(url:string,t?:string,options:RequestInit={}){return new Request(url,{...options,headers:{...(t?{authorization:'Bearer '+t}:{}),...options.headers}});}
const url='https://test.local/api/phase5/owner/portfolio?projectId=synthetic-project';
function mock(){let count=0;const l:Phase5PreviewLoader={async portfolio(project){count++;return {project,tasks:[]};},async biography(project,agent){count++;return {project,agent,tasks:[]};}};return {l,count:()=>count};}

test('valid signed owner JWT',()=>assert.equal(requireOwnerJwt('Bearer '+token(),cfg,now),cfg.ownerSubject));
test('unsigned and missing tokens denied',()=>assert.throws(()=>requireOwnerJwt(null,cfg,now),IdentityDenied));
test('forged owner subject denied',()=>assert.throws(()=>requireOwnerJwt('Bearer '+token({sub:'attacker'}),cfg,now),IdentityDenied));
test('wrong issuer denied',()=>assert.throws(()=>requireOwnerJwt('Bearer '+token({iss:'https://evil.test'}),cfg,now),IdentityDenied));
test('wrong audience denied',()=>assert.throws(()=>requireOwnerJwt('Bearer '+token({aud:'prod'}),cfg,now),IdentityDenied));
test('expired JWT denied',()=>assert.throws(()=>requireOwnerJwt('Bearer '+token({iat:now-500,nbf:now-500,exp:now-400}),cfg,now),IdentityDenied));
test('excessive token lifetime denied',()=>assert.throws(()=>requireOwnerJwt('Bearer '+token({iat:now-100,exp:now+400}),cfg,now),IdentityDenied));
test('future not-before denied',()=>assert.throws(()=>requireOwnerJwt('Bearer '+token({nbf:now+120}),cfg,now),IdentityDenied));
test('unexpected key identifier denied',()=>assert.throws(()=>requireOwnerJwt('Bearer '+token({}, {kid:'wrong'}),cfg,now),IdentityDenied));
test('alg none denied',()=>assert.throws(()=>requireOwnerJwt('Bearer '+token({}, {alg:'none'}),cfg,now),IdentityDenied));
test('injected remote JWK URL denied',()=>assert.throws(()=>requireOwnerJwt('Bearer '+token({}, {jku:'https://evil.test'}),cfg,now),IdentityDenied));
test('tampered payload denied',()=>{const t=token().split('.');t[1]=enc({...base,sub:'forged'});assert.throws(()=>requireOwnerJwt('Bearer '+t.join('.'),cfg,now),IdentityDenied);});
test('boolean timestamp denied',()=>assert.throws(()=>requireOwnerJwt('Bearer '+token({iat:true}),cfg,now),IdentityDenied));
test('audience arrays denied',()=>assert.throws(()=>requireOwnerJwt('Bearer '+token({aud:[cfg.audience]}),cfg,now),IdentityDenied));

test('disabled feature blocks database access',()=>withEnv(async()=>{const m=mock();delete process.env.SCOTTY_PHASE5_STAGING_ENABLED;assert.equal((await handlePhase5(req(url,token()),new URL(url),m.l)).status,503);assert.equal(m.count(),0);}));
test('production context blocks database access',()=>withEnv(async()=>{const m=mock();process.env.SCOTTY_ENV='production';assert.equal((await handlePhase5(req(url,token()),new URL(url),m.l)).status,503);assert.equal(m.count(),0);}));
test('read-only flag required',()=>withEnv(async()=>{const m=mock();delete process.env.SCOTTY_PHASE5_READ_ONLY;assert.equal((await handlePhase5(req(url,token()),new URL(url),m.l)).status,503);assert.equal(m.count(),0);}));
test('missing credentials blocks DB lookup',()=>withEnv(async()=>{const m=mock();assert.equal((await handlePhase5(req(url),new URL(url),m.l)).status,401);assert.equal(m.count(),0);}));
test('agent token cannot impersonate owner',()=>withEnv(async()=>{const m=mock();assert.equal((await handlePhase5(req(url,token({sub:'agent-spock-01'})),new URL(url),m.l)).status,401);assert.equal(m.count(),0);}));
test('portfolio returns exact requested project',()=>withEnv(async()=>{const m=mock();const r=await handlePhase5(req(url,token()),new URL(url),m.l);assert.equal(r.status,200);assert.equal((await r.json()).projectId,'synthetic-project');assert.equal(m.count(),1);}));
test('biography constrained to canonical-shape ID',()=>withEnv(async()=>{const m=mock();const u='https://test.local/api/phase5/agents/agent-spock-01/biography?projectId=synthetic-project';const r=await handlePhase5(req(u,token()),new URL(u),m.l);assert.equal(r.status,200);assert.equal((await r.json()).data.agent,'agent-spock-01');}));
test('duplicate project identifier is rejected',()=>withEnv(async()=>{const m=mock();const u=url+'&projectId=other';assert.equal((await handlePhase5(req(u,token()),new URL(u),m.l)).status,400);assert.equal(m.count(),0);}));
test('unexpected query parameter rejected',()=>withEnv(async()=>{const m=mock();const u=url+'&admin=true';assert.equal((await handlePhase5(req(u,token()),new URL(u),m.l)).status,400);assert.equal(m.count(),0);}));
test('browser origin denied',()=>withEnv(async()=>{const m=mock();assert.equal((await handlePhase5(req(url,token(),{headers:{origin:'https://other.test'}}),new URL(url),m.l)).status,403);assert.equal(m.count(),0);}));
test('cookie requests denied',()=>withEnv(async()=>{const m=mock();assert.equal((await handlePhase5(req(url,token(),{headers:{cookie:'scotty_session=abc'}}),new URL(url),m.l)).status,403);assert.equal(m.count(),0);}));
test('all POST mutations disabled',()=>withEnv(async()=>{const m=mock();assert.equal((await handlePhase5(req(url,token(),{method:'POST',body:'{}'}),new URL(url),m.l)).status,405);assert.equal(m.count(),0);}));
test('unknown routes cannot execute',()=>withEnv(async()=>{const m=mock();const u='https://test.local/api/phase5/activate?projectId=synthetic-project';assert.equal((await handlePhase5(req(u,token()),new URL(u),m.l)).status,404);assert.equal(m.count(),0);}));
test('database error details never leak',()=>withEnv(async()=>{const broken:Phase5PreviewLoader={async portfolio(){throw Error('SECRET');},async biography(){throw Error('SECRET');}};const r=await handlePhase5(req(url,token()),new URL(url),broken);assert.equal(r.status,503);assert.equal(JSON.stringify(await r.json()).includes('SECRET'),false);}));
