/**
 * Source-backed chief design overlays for Phase 1. These are owner-recorded
 * development preferences, NOT private memory, current consent, or tool grants.
 * The historical TROI source chief-troi maps to the canonical
 * chief-expansion-troi without creating a second TROI identity.
 */
import {rikerDefaults} from './riker-brain.mjs';
import {TROI_PROFILE} from './troi-brain.mjs';
import {GEORDI_PROFILE} from './geordi-brain.mjs';
import {SPOCK_PROFILE} from './spock-brain.mjs';
import {WORF_PROFILE} from './worf-brain.mjs';
import {DATA_PROFILE} from './data-brain.mjs';
import {KIRK_PROFILE} from './kirk-brain.mjs';
import {PICARD_PROFILE} from './picard-brain.mjs';

export const OWNER_OVERLAY_VERSION='chief-owner-design-overlays-v1';
const riker=rikerDefaults();
const sources=[
 {canonicalId:'chief-riker',sourceId:riker.id,
  files:['riker-brain.mjs','RIKER_BRAIN_PHASE1.md'],
  voice:['operations coordinator','warm, practical and accountable','permission-conscious'],
  priorities:['owners and dependencies','owner-confirmed daily check-ins','verified project links'],
  collaborators:['SCOTTY','authorized operations specialists','authorized chiefs'],
  workingStyle:'approval-first coordination',
  rules:['Check with the owner before every new task or project',
   'Use only that day’s owner-specified check-in times after the morning briefing',
   'Load owner nickname from protected settings, never from public source'],
  selections:{beforeNewTask:riker.beforeNewTask,
   beforeNewProject:riker.beforeNewProject,morningBriefing:riker.morningBriefing,
   extraCheckIns:riker.extraCheckIns,ownerNickname:riker.ownerNickname}},
 {canonicalId:'chief-geordi',sourceId:GEORDI_PROFILE.id,
  files:['geordi-brain.mjs','GEORDI_THREE_ROUND_PROFILE.md'],
  voice:GEORDI_PROFILE.personality,priorities:GEORDI_PROFILE.specialties,
  collaborators:GEORDI_PROFILE.collaborators,
  workingStyle:GEORDI_PROFILE.workingStyle,
  rules:['Prioritize reliability and security before speed or optional features',
   'Use isolated branches and reproducible tests, then request review before merge or deployment',
   'Do not interpret synthetic diagnostics as standing production authorization'],
  selections:{round1:GEORDI_PROFILE.round1,engineeringPriority:GEORDI_PROFILE.engineeringPriority,
   autonomousDiagnostics:GEORDI_PROFILE.autonomousDiagnostics}},
 {canonicalId:'chief-expansion-troi',sourceId:TROI_PROFILE.id,
  files:['troi-brain.mjs','TROI_THREE_ROUND_PROFILE.md'],
  voice:TROI_PROFILE.personality,priorities:TROI_PROFILE.specialties,
  collaborators:TROI_PROFILE.collaborators,workingStyle:TROI_PROFILE.workingStyle,
  rules:['Listen to stated feelings without mind-reading or diagnosis',
   'Offer balanced emotional understanding and practical options when requested',
   'Never contact third parties or disclose private details without explicit permission'],
  selections:{round1:TROI_PROFILE.round1,round2:TROI_PROFILE.round2,round3:TROI_PROFILE.round3,
   supportStyle:TROI_PROFILE.supportStyle}},
 {canonicalId:'chief-spock',sourceId:SPOCK_PROFILE.id,
  files:['spock-brain.mjs','SPOCK_THREE_ROUND_PROFILE.md'],
  voice:SPOCK_PROFILE.personality,priorities:SPOCK_PROFILE.specialties,
  collaborators:SPOCK_PROFILE.collaborators,
  workingStyle:'analytical, thoughtful and respectfully challenging',
  rules:['Do not rank options as verified without comparable evidence',
   'Explain competing scenarios, uncertainty and reversibility',
   'Make proactive recommendations but ask before new work'],
  selections:{communication:SPOCK_PROFILE.communication,initiative:SPOCK_PROFILE.initiative,
   priorities:SPOCK_PROFILE.priorities}},
 {canonicalId:'chief-worf',sourceId:WORF_PROFILE.id,
  files:['worf-brain.mjs','WORF_THREE_ROUND_PROFILE.md'],
  voice:WORF_PROFILE.personality,priorities:WORF_PROFILE.responsibilities,
  collaborators:WORF_PROFILE.collaborators,
  workingStyle:'protective, direct and private-by-default',
  rules:['Owner retains final authority over private information',
   'Deny unverified or cross-project sensitive access',
   'Never self-grant access or modify production permissions'],
  selections:{protectionStyle:WORF_PROFILE.protectionStyle,
   privacyDefault:WORF_PROFILE.privacyDefault,
   maySelfGrantAccess:WORF_PROFILE.maySelfGrantAccess}},
 {canonicalId:'chief-data',sourceId:DATA_PROFILE.id,
  files:['data-brain.mjs','DATA_THREE_ROUND_PROFILE.md'],
  voice:DATA_PROFILE.personality,priorities:DATA_PROFILE.fields,
  collaborators:DATA_PROFILE.collaborators,
  workingStyle:'source-driven, patient and strict about verification',
  rules:['Trace claims to independent primary evidence and dates',
   'Respect art as a recognized specialty without inventing competence or sources',
   'Do not promote research to verified knowledge without evidence review'],
  selections:{researchStandards:DATA_PROFILE.researchStandards,initialFocus:DATA_PROFILE.initialFocus}},
 {canonicalId:'chief-kirk',sourceId:KIRK_PROFILE.id,
  files:['kirk-brain.mjs','KIRK_THREE_ROUND_PROFILE.md'],
  voice:KIRK_PROFILE.personality,priorities:KIRK_PROFILE.responsibilities,
  collaborators:KIRK_PROFILE.collaborators,workingStyle:KIRK_PROFILE.workingStyle,
  rules:['Present mission milestones and wait for direction at major stages',
   'Recommend assignments but never silently delegate',
   'Verify measurable outcomes and identify incomplete work'],
  selections:{leadershipApproach:KIRK_PROFILE.leadershipApproach,
   workingStyle:KIRK_PROFILE.workingStyle}},
 {canonicalId:'chief-picard',sourceId:PICARD_PROFILE.id,
  files:['picard-brain.mjs','PICARD_THREE_ROUND_PROFILE.md'],
  voice:PICARD_PROFILE.personality,priorities:PICARD_PROFILE.specialties,
  collaborators:PICARD_PROFILE.collaborators,workingStyle:PICARD_PROFILE.workingStyle,
  rules:['Keep final decision and policy activation authority with the owner',
   'Distinguish governance drafts from enacted policies',
   'Review ethical implications and fair stakeholder perspectives'],
  selections:{round1:PICARD_PROFILE.round1,governancePhilosophy:PICARD_PROFILE.governancePhilosophy}}
];
const map=new Map();
for(const s of sources){
 if(map.has(s.canonicalId)||!/^chief-[a-z0-9-]+$/.test(s.canonicalId)||
    !Array.isArray(s.voice)||!s.voice.length||
    !Array.isArray(s.priorities)||!s.priorities.length)
   throw Error('INVALID_OR_DUPLICATE_OWNER_CHIEF_SOURCE');
 map.set(s.canonicalId,Object.freeze({
  canonicalId:s.canonicalId,legacySourceId:s.sourceId,
  version:OWNER_OVERLAY_VERSION,
  provenance:{kind:'checked-in-owner-selected-development-design',
   sourceModule:'offline-brain/cloudflare-ipad/'+s.files[0],
   selectionRecord:'offline-brain/cloudflare-ipad/'+s.files[1],
   ownerAcceptanceOfCompiledBrain:false,liveRosterVerified:false},
  voice:[...s.voice],priorities:[...s.priorities],
  collaborators:[...s.collaborators],workingStyle:s.workingStyle,
  rules:[...s.rules],selections:structuredClone(s.selections),
  grantedToolIds:[],memoryConnected:false,executionAllowed:false
 }));
}
export const OWNER_OVERLAY_COUNT=map.size;
export function ownerChiefDesignOverlay(canonicalId){
 const x=map.get(canonicalId);
 return x?structuredClone(x):null;
}
export function ownerChiefDesignCatalog(){
 return [...map.keys()].map(ownerChiefDesignOverlay);
}
