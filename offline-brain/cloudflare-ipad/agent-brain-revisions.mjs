/**
 * Phase 1 editable profile review packets. No authenticated owner session exists
 * in this standalone module. It cannot approve or activate a revision.
 * A production acceptance service must later resolve server-side identity,
 * revision locking, history and project permission before any write.
 */
import {agentBrain,BRAIN_SPEC_VERSION} from './individual-agent-brains.mjs';

export const PROFILE_REVIEW_VERSION='phase1-profile-review-v1';
const FIELDS=new Set([
 'voice','reasoningEmphasis','preferredWorkMethod',
 'acceptanceStandard','handoffPreference','limitationsNote'
]);
const metadata=/^[a-z0-9][a-z0-9_-]{3,99}$/i;
function validateText(v){
 if(typeof v!=='string'||v.length<8||v.length>600||v.trim()!==v||
    /[\u0000-\u001f\u007f]/.test(v))
   throw Error('INVALID_PROFILE_TEXT');
 return v;
}
function canonicalPatch(p){
 if(!p||typeof p!=='object'||Array.isArray(p)||
   Object.keys(p).length<1||Object.keys(p).length>6)
   throw Error('EMPTY_OR_INVALID_PROFILE_PATCH');
 const entries=Object.entries(p);
 for(const [k,v] of entries){
  if(!FIELDS.has(k))throw Error('IMMUTABLE_OR_UNAUTHORIZED_PROFILE_FIELD');
  validateText(v);
 }
 return Object.fromEntries(entries.sort(([a],[b])=>a.localeCompare(b)));
}
const asBytes=async s=>{
 const value=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
 return [...new Uint8Array(value)].map(x=>x.toString(16).padStart(2,'0')).join('');
};
export async function proposeAgentProfileRevision({
 agentId,baseVersion=BRAIN_SPEC_VERSION,patch,editorNote='',
 requestId
}={}){
 const brain=agentBrain(agentId);
 if(baseVersion!==BRAIN_SPEC_VERSION)throw Error('STALE_BRAIN_BASE_VERSION');
 if(typeof requestId!=='string'||!metadata.test(requestId))
   throw Error('INVALID_REVISION_REQUEST_ID');
 if(typeof editorNote!=='string'||editorNote.length>300||
    /[\u0000-\u001f\u007f]/.test(editorNote))
   throw Error('INVALID_REVIEW_NOTE');
 const proposed=canonicalPatch(patch);
 const intent=JSON.stringify({
  schema:PROFILE_REVIEW_VERSION,agentId,baseVersion,requestId,proposed
 });
 const fingerprint=await asBytes(intent);
 return {
  schemaVersion:PROFILE_REVIEW_VERSION,requestId,agentId,
  basedOn:baseVersion,existingRole:brain.role,
  existingChief:brain.chiefId,
  patch:proposed,changeDigest:fingerprint,
  originalSnapshot:{
   voice:brain.persona.voice,
   reasoningInstructions:brain.reasoningInstructions,
   workingMethod:[...brain.workingMethod],
   completionStandards:[...brain.completionStandards]
  },
  editorNote,
  proposedRevision:'draft-'+fingerprint.slice(0,16),
  source:'user-drafted-unverified-proposal',
  state:'PENDING_VERIFIED_OWNER_REVIEW',
  ownerIdentityVerified:false,ownerAccepted:false,
  applied:false,usedByAgentRuntime:false,executed:false,
  writes:0,toolGrants:[],privateMemoryWrites:0,
  note:'Editing draft values cannot alter source, grant rights or count as owner acceptance. A distinct authenticated backend service must review and persist changes.'
 };
}
export async function compareAgentRevision(a,b){
 if(!a||!b||a.agentId!==b.agentId)return {comparable:false};
 const fields=new Set([...Object.keys(a.patch||{}),...Object.keys(b.patch||{})]);
 return {
  comparable:true,agentId:a.agentId,baseMatch:a.basedOn===b.basedOn,
  sameIntent:a.changeDigest===b.changeDigest,
  changedFields:[...fields].sort().filter(k=>a.patch?.[k]!==b.patch?.[k]),
  safeToAutomaticallyApply:false
 };
}
