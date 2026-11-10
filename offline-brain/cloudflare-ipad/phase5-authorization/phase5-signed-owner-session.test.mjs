import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createPhase5SyntheticOwnerSessionResolver} from './phase5-signed-owner-session.mjs';

const NOW=Date.parse('2026-11-09T16:00:00Z');
const issuer='scotty-p5-synthetic-idp';
const aud='scotty-p5-synthetic-preview';
const keys=generateKeyPairSync('ed25519');
const wrongKeys=generateKeyPairSync('ed25519');
const publicPem=k=>k.publicKey.export({type:'spki',format:'pem'});
const trusted={'SYN-SESSION-KEY-001':{issuer,active:true,publicKeyPem:publicPem(keys)}};
const claims={iss:issuer,aud,sub:'SYN-OWNER-001',jti:'SYN-SESSION-001',
 iat:Math.floor(NOW/1000)-60,nbf:Math.floor(NOW/1000)-60,
 exp:Math.floor(NOW/1000)+120,version:1,purpose:'synthetic-owner-preview'};
const h={alg:'EdDSA',typ:'SCOTTY-P5-SYNTHETIC-SESSION',kid:'SYN-SESSION-KEY-001'};
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const makeToken=(payload=claims,header=h,privateKey=keys.privateKey)=>{
 const input=b64(header)+'.'+b64(payload);
 return input+'.'+sign(null,Buffer.from(input),privateKey).toString('base64url');
};
const request=(token=makeToken(),body={})=>({method:'GET',
 headers:{get:k=>k==='authorization'?'Bearer '+token:null},body});
function resolver(overrides={}){
 return createPhase5SyntheticOwnerSessionResolver({
  trustedKeys:trusted,enabled:true,now:()=>NOW,
  loadProjectMembershipForSubject:async ({subject})=>subject==='SYN-OWNER-001'?['synthetic']:['SYN-PROJECT-OTHER'],
  isSessionRevoked:async()=>false,
  ...overrides
 });
}
const checkDenied=async (label,token,config={})=>{
 await test(label,async()=>assert.rejects(resolver(config)(request(token)),/SYNTHETIC_OWNER_SESSION_REJECTED/));
};
test('constructor requires independently provisioned public keys and authority callbacks',()=>{
 assert.throws(()=>createPhase5SyntheticOwnerSessionResolver(),/INDEPENDENT_SESSION_TRUST_REQUIRED/);
 assert.throws(()=>createPhase5SyntheticOwnerSessionResolver({trustedKeys:{},loadProjectMembershipForSubject:async()=>['synthetic'],isSessionRevoked:async()=>false}),/INDEPENDENT_SESSION_TRUST_REQUIRED/);
});
test('disabled by default even with signed synthetic token',async()=>{
 const get=resolver({enabled:false});
 await assert.rejects(get(request()),/PHASE5_SESSION_DISABLED/);
});
test('valid temporary signed session derives identity and project from trusted callbacks',async()=>{
 const ctx=await resolver()(request(makeToken(),{roles:['administrator'],projectId:'SYN-PROJECT-OTHER'}));
 assert.equal(ctx.verifiedByServer,true);assert.equal(ctx.subject,'owner');
 assert.equal(ctx.principalId,'SYN-OWNER-001');
 assert.deepEqual(ctx.authorizedProjectIds,['synthetic']);
 assert.deepEqual(ctx.permissions.synthetic,['workspace:read','knowledge:propose']);
 assert.equal(ctx.permissions['SYN-PROJECT-OTHER'],undefined);
 assert.equal(ctx.stagingOnly,true);
});
test('different signed owner receives only that subject\'s server-provided projects',async()=>{
 const different=makeToken({...claims,sub:'SYN-OWNER-002',jti:'SYN-SESSION-002'});
 const ctx=await resolver()(request(different));
 assert.deepEqual(ctx.authorizedProjectIds,['SYN-PROJECT-OTHER']);
 assert.equal(ctx.permissions.synthetic,undefined);
});
test('concurrent sessions cannot reuse another owner\'s project membership',async()=>{
 const a=makeToken(),b=makeToken({...claims,sub:'SYN-OWNER-002',jti:'SYN-SESSION-002'});
 const get=resolver();
 const r=await Promise.all([get(request(a)),get(request(b)),get(request(a)),get(request(b))]);
 assert.equal(r.filter(x=>!!x.permissions.synthetic).length,2);
 assert.equal(r.filter(x=>!!x.permissions['SYN-PROJECT-OTHER']).length,2);
});
await checkDenied('unknown signing key is rejected',
 makeToken(claims,{...h,kid:'SYN-SESSION-KEY-UNKNOWN'}));
await checkDenied('incorrect signing key is rejected',makeToken(claims,h,wrongKeys.privateKey));
await checkDenied('unsupported algorithm is rejected',makeToken(claims,{...h,alg:'HS256'}));
await checkDenied('wrong audience is rejected',makeToken({...claims,aud:'other-service'}));
await checkDenied('wrong issuer is rejected',makeToken({...claims,iss:'other-issuer'}));
await checkDenied('expired signed session is rejected',makeToken({...claims,exp:Math.floor(NOW/1000)-1}));
await checkDenied('future issued-at is rejected',makeToken({...claims,iat:Math.floor(NOW/1000)+1}));
await checkDenied('not-before in future is rejected',makeToken({...claims,nbf:Math.floor(NOW/1000)+15}));
await checkDenied('session lifetime over ten minutes is rejected',makeToken({...claims,exp:Math.floor(NOW/1000)+900}));
await checkDenied('wrong principal format is rejected',makeToken({...claims,sub:'owner'}));
await checkDenied('wrong session identifier format is rejected',makeToken({...claims,jti:'session-001'}));
await checkDenied('unsigned extra role field is forbidden',makeToken({...claims,roles:['owner','admin']}));
await checkDenied('token cannot self-assert project membership',makeToken({...claims,projects:['SYN-PROJECT-OTHER']}));
await checkDenied('tampered payload without valid re-signing is rejected',(()=>{
 const tok=makeToken().split('.');
 tok[1]=b64({...claims,sub:'SYN-OWNER-002'});
 return tok.join('.');
})());
test('revoked session callback denies even if signature remains valid',async()=>{
 await assert.rejects(resolver({isSessionRevoked:async()=>true})(request()),/SYNTHETIC_OWNER_SESSION_REJECTED/);
});
test('revocation lookup failure denies',async()=>{
 await assert.rejects(resolver({isSessionRevoked:async()=>{throw Error('offline');}})(request()),/SYNTHETIC_OWNER_SESSION_REJECTED/);
});
test('missing trusted membership denies',async()=>{
 await assert.rejects(resolver({loadProjectMembershipForSubject:async()=>[]})(request()),/SYNTHETIC_OWNER_SESSION_REJECTED/);
});
test('invalid trusted membership denies instead of passing through',async()=>{
 await assert.rejects(resolver({loadProjectMembershipForSubject:async()=>['production']})(request()),/SYNTHETIC_OWNER_SESSION_REJECTED/);
});
test('membership provider outage denies',async()=>{
 await assert.rejects(resolver({loadProjectMembershipForSubject:async()=>{throw Error('down');}})(request()),/SYNTHETIC_OWNER_SESSION_REJECTED/);
});
test('refuses absent or malformed authorization header',async()=>{
 const get=resolver();
 await assert.rejects(get({headers:{get:()=>null}}),/SYNTHETIC_OWNER_SESSION_REJECTED/);
 await assert.rejects(get({headers:{get:()=> 'Basic abc'}}),/SYNTHETIC_OWNER_SESSION_REJECTED/);
});
test('trust store cannot accept wrong issuer or non-Ed25519 algorithm',()=>{
 const resolverOpts={loadProjectMembershipForSubject:async()=>['synthetic'],isSessionRevoked:async()=>false};
 assert.throws(()=>createPhase5SyntheticOwnerSessionResolver({
  ...resolverOpts,trustedKeys:{'SYN-SESSION-KEY-001':{issuer:'wrong',active:true,publicKeyPem:publicPem(keys)}}
 }),/INVALID_TEST_SESSION_TRUST_KEY/);
 const ec=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 assert.throws(()=>createPhase5SyntheticOwnerSessionResolver({
  ...resolverOpts,trustedKeys:{'SYN-SESSION-KEY-001':{issuer,active:true,publicKeyPem:publicPem(ec)}}
 }),/ED25519_SESSION_PUBLIC_KEY_REQUIRED/);
});
test('removing trusted key blocks previously valid synthetic sessions',async()=>{
 const newKey=generateKeyPairSync('ed25519');
 const rotated=resolver({trustedKeys:{'SYN-SESSION-KEY-002':{issuer,active:true,publicKeyPem:publicPem(newKey)}}});
 await assert.rejects(rotated(request(makeToken())),/SYNTHETIC_OWNER_SESSION_REJECTED/);
});
