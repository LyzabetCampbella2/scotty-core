#!/usr/bin/env node
/**
 * Read-only audit of SCOTTY A0 certification evidence.
 * It never creates an approval; an owner-approved evidence record must be
 * independently verified, and no write/deploy is authorized by this script.
 */
import {readFileSync} from "node:fs";
const path=process.argv[2]||new URL("../docs/a0/certification-evidence.json",import.meta.url);
let data;
try{data=JSON.parse(readFileSync(path,"utf8"));}catch(error){console.error("A0 evidence unreadable:",error.message);process.exit(2);}
const required=[
 "canonical_id_structure","owner_signed_roster_freeze","alias_disposition",
 "source_of_truth_mapping","isolated_staging_resource",
 "real_executor_approval_enforcement","owner_identity_and_session_auth",
 "global_emergency_stop_drill","real_encrypted_backup_restored_independently",
 "spending_ceiling_and_alerts","data_policy_rights_retention",
 "owner_signed_phase_0_acceptance"
];
const ids=new Set((data.gates||[]).map(g=>g.id));
const gates=required.map(id=>data.gates?.find(g=>g.id===id));
const issues=[];
if(data.project!=="SCOTTY"||data.stage!=="A"||data.phase!==0)issues.push("wrong-project-or-stage");
if(ids.size!==(data.gates||[]).length)issues.push("duplicate-evidence-gates");
for(let i=0;i<required.length;i++){
 const gate=gates[i];
 if(!gate){issues.push("missing:"+required[i]);continue;}
 if(gate.status!=="verified")issues.push(gate.id+":"+gate.status);
 if(gate.status==="verified" && (!gate.evidence||typeof gate.evidence!=="string"))issues.push(gate.id+":missing-proof");
}
const sign=data.explicitOwnerDecision||{};
for(const field of [
 "signer","recordedAt","approvedSnapshotCommit","approvedAliases",
 "approvedDataSources","approvedBudget","approvedPrivileges",
 "verifiedRestoreReceipt","verifiedStopAllReceipt","externalApprovalReference"
]) if(!sign[field])issues.push("owner-signoff:"+field);
if(data.certificationStatus!=="CERTIFIED")issues.push("certification-status:"+data.certificationStatus);
console.log(JSON.stringify({
 stage:"A",phase:0,readyForNextPhase:issues.length===0,
 checkedGates:required.length,
 verifiedGates:gates.filter(g=>g?.status==="verified").length,
 blockingItems:issues,
 caveat:"A passing file format check is NOT independent validation of owner identity, permissions, backup data or remote resources."
},null,2));
process.exit(issues.length?2:0);
