/** Names and IDs from src/agents/cloud.ts fallback; NOT a live database export. */
import {DEPARTMENTS} from "../catalog.mjs";
import {expandTeam,brainProfile} from "./team-expansion.mjs";
const seedNames=["O'Brien","Seven Ops","Privacy","Sarek","Risa","Bashir","Vox","Rubric","Lingua","Lab","Circuit","Saru","Guinan Herbal","Chronos","Switchboard","Factcheck","Guinan","Stellar","Number One","Vulcan","Sato","Resolver","PADD","Subspace","Hoshi","Context","CRM","Prime","Watchtower","Audit Sec","Deadline","PADD Legal","Lockout","Transporter","Replicator","Evidence","Promo","Chapel","Dax","ROM","Garak","Enterprise","Neelix","Signal","Daystrom","Academy","Jake","Holodeck","Benny","EMH","SCRIBE","Sentinel","Curator","Echo","Probe","Archer","Combadge","LCARS","Patch","Paris","Sisko","Helm","Mission Control","Delta","Argus","Red Alert","Indexer","Sarek Legal","Archive","QA Core","Policy","Dispatch","Shields","Tuvok","PADD Ops","EMH Persona","Trigger","NOO","Yeoman","Rand","Relay Auto","Examiner","Scheduler","Genesis","B-4","Risa Ayurveda","Boothby","Dockyard","Recovery","Vaultguard","JAG","Garax","Design","Vic","Miles","Lwaxana","Seven","Merchant","Security Command"];
export function legacySourceRoster(){
 let seed=0; const rows=[];
 for(const d of DEPARTMENTS) rows.push({id:"chief-"+d.slug,name:d.chief,department:d.name,isChief:true,chiefId:null,specialty:"Department leadership",skills:[...d.skills],provenance:"production-source-fallback"});
 for(const [ci,d] of DEPARTMENTS.entries()) for(let j=0;j<(ci<8?10:9);j++) rows.push({id:`agent-${d.slug}-${String(j+1).padStart(2,"0")}`,name:seedNames[seed++]||`${d.chief}-${String(j+1).padStart(2,"0")}`,department:d.name,isChief:false,chiefId:"chief-"+d.slug,specialty:d.specialties[j],skills:[d.specialties[j],...d.skills],provenance:"production-source-fallback"});
 return rows;
}
export function connectedRoster(){return expandTeam(legacySourceRoster()).roster.map((a,i)=>({...a,sortOrder:i,brain:brainProfile(a)}));}

