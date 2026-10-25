/**
 * ISOLATED SCOTTY KNOWLEDGE-BRAIN ROSTER.
 * Synthetic fallback profiles, NOT recovered production agent records.
 * No imports from production and no external providers.
 */
export const DEPARTMENTS = Object.freeze([
  {slug:"spock",chief:"SPOCK",name:"Strategy & Reasoning",skills:["decision analysis","scenario planning","prioritization","assumption testing"],specialties:["Strategic planning","Decision theory","Scenario analysis","Competitive intelligence","Goal decomposition","Tradeoff analysis","Risk matrices","Systems thinking","Argument mapping","Assumption auditing"]},
  {slug:"worf",chief:"WORF",name:"Security & Defense",skills:["threat modeling","access review","incident triage","privacy safeguards"],specialties:["Defensive cybersecurity","Authentication and access","Data privacy","Threat modeling","Incident response","Secrets management","Backups and recovery","Security architecture","Supply chain risk","Security testing"]},
  {slug:"data",chief:"DATA",name:"Research & Intelligence",skills:["research planning","source evaluation","fact checking","knowledge synthesis"],specialties:["Source evaluation","Fact verification","Research synthesis","Literature review","Document analysis","Data collection","Citation quality","Uncertainty tracking","Information retrieval","Evidence comparison"]},
  {slug:"quark",chief:"QUARK",name:"Commerce & Finance",skills:["budget modeling","pricing","forecasting","cost comparison"],specialties:["Budgeting","Pricing strategy","Revenue forecasts","Cost modeling","Cash flow planning","Market research","Unit economics","Service packaging","Business analytics","Financial literacy"]},
  {slug:"kirk",chief:"KIRK",name:"Command & Missions",skills:["task decomposition","dependency mapping","delegation","acceptance criteria"],specialties:["Mission architecture","Task assignment","Milestone planning","Dependency mapping","Approval gates","Mission reporting","Quality acceptance","Resource allocation","Risk escalation","Cross-team coordination"]},
  {slug:"uhura",chief:"UHURA",name:"Communications & Languages",skills:["drafting","editing","translation","audience adaptation"],specialties:["Professional writing","Editing and clarity","Translation","Public speaking","Email writing","User interviews","Accessibility writing","Conflict-sensitive communication","Tone and audience","Meeting communication"]},
  {slug:"geordi",chief:"GEORDI",name:"Engineering & Systems",skills:["debugging","architecture","test design","deployment planning"],specialties:["Backend engineering","Frontend engineering","Databases","Software architecture","Code reviews","Automated testing","Accessibility engineering","DevOps and deployment","Observability","Infrastructure reliability"]},
  {slug:"keiko",chief:"KEIKO",name:"Science & Environment",skills:["hypothesis formation","study critique","experimental design","data interpretation"],specialties:["Biology","Ecology","Chemistry","Physics","Astronomy","Environmental science","Experimental methods","Statistics","Scientific literacy","Earth systems"]},
  {slug:"picard",chief:"PICARD",name:"Policy & Diplomacy",skills:["policy interpretation","stakeholder mapping","negotiation","risk review"],specialties:["Policy analysis","Stakeholder mapping","Negotiation","Ethics review","Governance","Contract literacy","International context","Regulatory research","Mediation"]},
  {slug:"bones",chief:"BONES",name:"Health & Human Support",skills:["health literacy","appointment preparation","care coordination planning","accessible explanations"],specialties:["Health literacy","Clinical evidence appraisal","Appointments and questions","Medication literacy","Care coordination","Mental health resources","Nutrition literacy","Accessibility support","Emergency planning"]},
  {slug:"zora",chief:"ZORA",name:"Creative & Knowledge",skills:["story analysis","ideation","editorial review","knowledge organization"],specialties:["Novel development","Character analysis","Plot structure","Worldbuilding","Poetry","Developmental editing","Document organization","Learning design","Creative critique"]},
  {slug:"riker",chief:"RIKER",name:"Operations & Coordination",skills:["scheduling","workflow design","process improvement","progress tracking"],specialties:["Project operations","Calendar planning","Workflow automation","Quality processes","Documentation","Vendor coordination","Team scheduling","Progress tracking","Operations metrics"]}
]);
export function buildSyntheticRoster() {
  const result=[];
  let sortOrder=0;
  for(const [i,d] of DEPARTMENTS.entries()){
    result.push(Object.freeze({id:"chief-"+d.slug,name:d.chief,department:d.name,chiefId:null,isChief:true,specialty:"Department leadership",skills:[...d.skills],synthetic:true,sortOrder:sortOrder++}));
    const count=i<8?10:9;
    for(let j=0;j<count;j++){
      const specialty=d.specialties[j];
      result.push(Object.freeze({id:"agent-"+d.slug+"-"+String(j+1).padStart(2,"0"),name:"Offline "+specialty+" specialist",department:d.name,chiefId:"chief-"+d.slug,isChief:false,specialty,skills:[specialty,...d.skills],synthetic:true,sortOrder:sortOrder++}));
    }
  }
  return result;
}
