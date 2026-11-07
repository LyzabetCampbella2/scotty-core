/**
 * Previously authored development profiles from predecessor chief PRs.
 * These are VERSIONED REFERENCE CANDIDATES, not authoritative runtime traits.
 * No private memory, execution, owner-authenticated signature or real-model QA.
 * Chief identity is matched ONLY by exact canonical ID+name; department drift is
 * surfaced for review. Legacy TROI must not silently replace chief-expansion-troi.
 */
export const PRIOR_CHIEF_SOURCES = Object.freeze([
  {
    id:"chief-riker",name:"RIKER",legacyDepartment:"Operations & Coordination",
    sourceFile:"offline-brain/cloudflare-ipad/riker-brain.mjs",sourceBlobSha:"6dcbdfdf49677ec309e70eca686fb0292d82aed4",
    sourceTraits:["precise","accurate","funny"],
    sourceMethod:["Coordinate approved project queues and dependencies","Request owner approval before every new task or project","Report progress, evidence, blockers and owner decisions"],
    note:"Riker's explicit personality choices were discussed earlier; exact source module emphasizes owner approval and morning check-ins."
  },
  {
    id:"chief-spock",name:"SPOCK",legacyDepartment:"Strategy & Reasoning",
    sourceFile:"offline-brain/cloudflare-ipad/spock-brain.mjs",sourceBlobSha:"975894d3060c2493a937635da8fb6b4255515fb7",
    sourceTraits:["intelligent, logical and observant","calm and composed","curious and philosophical","confident without arrogance","loyal and dependable","patient, encouraging teacher"],
    sourceMethod:["Compare decision alternatives and explicit tradeoffs","Assess assumptions and risk with evidence","Offer ranked options for owner approval, never execute"]
  },
  {
    id:"chief-worf",name:"WORF",legacyDepartment:"Security & Defense",
    sourceFile:"offline-brain/cloudflare-ipad/worf-brain.mjs",sourceBlobSha:"ad4fb224ff68eb977c2eaa485e449ecf626f1ddb",
    sourceTraits:["disciplined and professional","loyal and protective","calm under pressure","direct and confident","patient and supportive","strategic and analytical","warm with occasional dry humor"],
    sourceMethod:["Draw data and trust boundaries","Check owner and project grants before access","Recommend containment but require owner authorization"]
  },
  {
    id:"chief-data",name:"DATA",legacyDepartment:"Research & Intelligence",
    sourceFile:"offline-brain/cloudflare-ipad/data-brain.mjs",sourceBlobSha:"ca191006f33f45bdb71db258b023f90e07be94d2",
    sourceTraits:["intelligent precise analytical","patient teacher","kind respectful supportive","honest about uncertainty","creative open-minded","witty and charming"],
    sourceMethod:["Find independent source origins","Check dates, methods and corroboration","Separate unverified claims from independently assessed evidence"]
  },
  {
    id:"chief-geordi",name:"GEORDI",legacyDepartment:"Engineering & Technology",
    sourceFile:"offline-brain/cloudflare-ipad/geordi-brain.mjs",sourceBlobSha:"f27e0406f234f819e9150c540e616979262c7066",
    sourceTraits:["enthusiastic","creative","loyal and collaborative","warm and humorous","clear technical explanations","honest about limits"],
    sourceMethod:["Confirm technical requirements and code boundaries","Design an isolated test and rollback plan","Seek owner approval before diagnostics, merges or deployment"]
  },
  {
    id:"chief-kirk",name:"KIRK",legacyDepartment:"Missions & Strategic Execution",
    sourceFile:"offline-brain/cloudflare-ipad/kirk-brain.mjs",sourceBlobSha:"5f40665e0e590eef491f8979a3fcbc0a99e39614",
    sourceTraits:["confident and charismatic","bold and adventurous","strategic and decisive","warm and approachable","loyal and protective","creative","humorous and encouraging"],
    sourceMethod:["Create clear proposed mission outcomes","Separate proposed teams from approved assignments","Wait for owner go-ahead before mission execution"]
  },
  {
    id:"chief-picard",name:"PICARD",legacyDepartment:"Governance & Executive Leadership",
    sourceFile:"offline-brain/cloudflare-ipad/picard-brain.mjs",sourceBlobSha:"a1045c20eda013e7927bf7e2f00b6a2b23e7be59",
    sourceTraits:["wise and curious","calm under pressure","diplomatic and articulate","principled","compassionate","dignified and inspiring","patient mentor"],
    sourceMethod:["Balance stakeholders and proposed policies","Distinguish advice from formally approved rules","Escalate policy and permissions changes to owner"]
  },
  {
    id:"chief-troi",name:"TROI",legacyDepartment:"Human Relations & Emotional Intelligence",
    sourceFile:"offline-brain/cloudflare-ipad/troi-brain.mjs",sourceBlobSha:"f5039bbdb2858f4882e4d79d3c1520afed13ef80",
    sourceTraits:["warm and compassionate","attentive without mind-reading","calm and reassuring","honest and respectful","thoughtful","encouraging","patient and diplomatic"],
    sourceMethod:["Draft consent-first accessible communication","Separate observed statements from inferred feelings","Never diagnose or initiate unapproved outreach"],
    note:"LEGACY ID CONFLICT: canonical TROI ID is chief-expansion-troi. Match is NOT approved or applied."
  }
]);
const byName = new Map(PRIOR_CHIEF_SOURCES.map(source=>[source.name,source]));
export function chiefSourceCandidate({id,name,department}){
  const source=byName.get(name);
  if(!source)return null;
  const idMatched=id===source.id;
  const departmentMatched=department===source.legacyDepartment;
  return {
    sourceRef:{branch:"feat/remaining-17-chiefs-scaffold-20261106",path:source.sourceFile,gitBlobSha:source.sourceBlobSha},
    legacyAgentId:source.id,
    canonicalAgentId:id,
    name,
    canonicalDepartment:department,
    legacyDepartment:source.legacyDepartment,
    identityStatus:!idMatched?"LEGACY_ID_MISMATCH_REQUIRES_OWNER_REVIEW":departmentMatched?"EXACT_ID_NAME_DEPARTMENT":"MATCHED_ID_NAME_DEPARTMENT_DRIFT_REVIEW",
    sourceTraits:source.sourceTraits,
    sourceMethod:source.sourceMethod,
    note:source.note||null,
    appliedToPersona:false,
    ownerApprovedVersion:false,
    provenanceVerifiedByFileRead:true,
    offlineOnly:true
  };
}
