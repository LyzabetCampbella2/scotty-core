/**
 * Fifth public specialist candidate review, after the 84-source baseline.
 * The source-to-agent route map below is code-owned, not provided by a
 * candidate manifest. Metadata checking does NOT verify source truth or
 * allow owner impersonation, private data or any live agent citation.
 */
import {validateFourthTenExpansionSpecialists} from "./phase3-fourth-ten-expansion-specialists.mjs";
import {validatePublicSpecialistBatch} from "./phase3-public-batch-validator.mjs";

const ROUTES=Object.freeze({
 "agent-expansion-041":["csrc.nist.gov","/glossary/term/repeatability"],
 "agent-expansion-042":["www.sba.gov","/counseling/manage-your-business/"],
 "agent-expansion-043":["ies.ed.gov","/ncee/WWC/PracticeGuide/1"],
 "agent-expansion-044":["acl.gov","/programs/aging-and-disability-networks/aging-and-disability-resource-centers"],
 "agent-geordi-01":["api-security.owasp.org","/editions/2023/en/0xa1-broken-object-level-authorization/"],
 "agent-geordi-02":["developer.mozilla.org","/en-US/docs/Learn_web_development/Core/Accessibility/HTML"],
 "agent-geordi-03":["www.postgresql.org","/docs/current/app-pgdump.html"],
 "agent-geordi-04":["docs.aws.amazon.com","/wellarchitected/latest/framework/"],
 "agent-geordi-05":["google.github.io","/eng-practices/review/"],
 "agent-geordi-06":["playwright.dev","/docs/test-assertions"]
});
export function validateFifthTenSpecialistSources(
 fifth,fourth,third,second,first,dataEleven,bonesEight,
 frozen,queue,chief1,chief2,chief3
){
 const prev=validateFourthTenExpansionSpecialists(
  fourth,third,second,first,dataEleven,bonesEight,frozen,queue,
  chief1,chief2,chief3
 );
 if(prev.summary.specialistsWithFirstSourceCandidate!==59||
    prev.summary.publicDocketsWithCandidate!==84)
  throw Error("B3_FIFTH_BATCH_REQUIRES_84_SOURCE_BASELINE");
 const priorAgentIds=[...chief1.items,...chief2.items,...chief3.items,
  ...bonesEight.items,...dataEleven.items,...first.items,...second.items,
  ...third.items,...fourth.items].map(x=>x.agentId);
 return validatePublicSpecialistBatch({
  manifest:fifth,routeRegistry:ROUTES,frozen,queue,priorAgentIds,
  batchKind:"ASSISTANT_INSPECTED_FIFTH_TEN_SPECIALIST_PUBLIC_PILOT",
  batchScope:"EXPANSION_SPECIALISTS_041_TO_044_AND_GEORDI_01_TO_06_K1_REVIEW_ONLY",
  observedOn:"2026-11-09",expectedTotalSpecialists:69,
  pilotPrefix:"b3-fifth-specialist-"
 });
}
