/**
 * Synthetic Phase 5 owner-approval proof verifier (Ed25519).
 * Verification ONLY: no private keys, signing, key fetching, credentials,
 * network connections, real owner approvals, or access decisions.
 * The trusted keyring MUST originate outside editable grant records.
 */
import {createPublicKey, verify as verifySignature} from 'node:crypto';

const ISSUER='scotty-p5-synthetic-owner';
const DOMAIN='SCOTTY-PHASE5-SYNTHETIC-OWNER-GRANT-v1';
const ID=/^SYN-GRANT-[A-Z0-9-]{1,100}$/;
const KEY_ID=/^SYN-KEY-[A-Z0-9-]{1,100}$/;
const PROJECT=/^[A-Za-z0-9_-]{1,100}$/;
const RESOURCE=/^SYN-[A-Z0-9-]{1,100}$/;
const ACTIONS=new Set(['workspace:read','knowledge:propose']);
const VALID_FIELDS=['id','subject','projectId','resourceProjectId','resourceId','action',
 'dataClass','version','status','revoked','expiresAt','proofIssuer','proofKeyId'];

function dateToIso(value) {
 const n=value instanceof Date?value.getTime():
   (typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)?Date.parse(value):NaN);
 if(!Number.isFinite(n))throw Error('INVALID_SYNTHETIC_PROOF_PAYLOAD');
 return new Date(n).toISOString();
}

/** Exact field order and domain separation. Never sign or verify free-form JSON. */
export function canonicalSyntheticOwnerGrant(grant) {
 if(!grant||typeof grant!=='object'||Array.isArray(grant)||
    !ID.test(grant.id)||grant.subject!=='owner'||
    !PROJECT.test(grant.projectId)||grant.resourceProjectId!==grant.projectId||
    !RESOURCE.test(grant.resourceId)||!ACTIONS.has(grant.action)||
    grant.dataClass!=='synthetic-only'||grant.version!==1||
    !['synthetic-approved','synthetic-revoked'].includes(grant.status)||
    typeof grant.revoked!=='boolean'||grant.proofIssuer!==ISSUER||
    !KEY_ID.test(grant.proofKeyId))throw Error('INVALID_SYNTHETIC_PROOF_PAYLOAD');
 const values=VALID_FIELDS.map(field=>field==='expiresAt'?dateToIso(grant.expiresAt):grant[field]);
 return Buffer.from(DOMAIN+'\n'+JSON.stringify(values),'utf8');
}

/**
 * Keys must be provisioned from independently trusted test configuration.
 * An editable database's proof_key_id cannot provision its own trusted key.
 * Key removal from trustedKeys denies previously signed grants (rotation).
 */
export function createSyntheticOwnerGrantProofVerifier({trustedKeys,issuer=ISSUER}={}) {
 if(issuer!==ISSUER||!trustedKeys||typeof trustedKeys!=='object'||Array.isArray(trustedKeys))
   throw Error('INDEPENDENT_SYNTHETIC_TRUST_ANCHOR_REQUIRED');
 const trusted=new Map();
 for(const [keyId,record] of Object.entries(trustedKeys)) {
   if(!KEY_ID.test(keyId)||record?.issuer!==ISSUER||record?.active!==true||
      typeof record?.publicKeyPem!=='string'||!record.publicKeyPem.startsWith('-----BEGIN PUBLIC KEY-----'))
     throw Error('INVALID_SYNTHETIC_TRUSTED_KEY');
   const key=createPublicKey(record.publicKeyPem);
   if(key.asymmetricKeyType!=='ed25519')throw Error('ED25519_PUBLIC_KEY_REQUIRED');
   trusted.set(keyId,key);
 }
 if(trusted.size<1)throw Error('INDEPENDENT_SYNTHETIC_TRUST_ANCHOR_REQUIRED');

 return async function verifyGrantProof(grant) {
   try {
     if(!grant||typeof grant.proofSignature!=='string'||
        !/^[A-Za-z0-9_-]{86}$/.test(grant.proofSignature))return false;
     const key=trusted.get(grant.proofKeyId);
     if(!key)return false;
     const signature=Buffer.from(grant.proofSignature,'base64url');
     if(signature.length!==64||signature.toString('base64url')!==grant.proofSignature)return false;
     const data=canonicalSyntheticOwnerGrant(grant);
     return verifySignature(null,data,key,signature)===true;
   }catch{return false}
 };
}
