import {claimMissionStep,finishMissionStep} from './chief-coordination.ts';
import {draftMessages,parseDraft} from './project-draft-model.ts';
type Provider=(messages:any[],tokens:number,signal:AbortSignal)=>Promise<{text:string;model:string}>;
const configuredProvider:Provider=async(messages,tokens,signal)=>{const {groqThink}=await import('../brain/cloud.ts');return groqThink(messages,tokens,signal);};
export async function runProjectDraft(project:string,id:string,revision:number,provider:Provider=configuredProvider){
 if(process.env.SCOTTY_REAL_PROJECT_DRAFTS_ENABLED!=='true'||!process.env.GROQ_API_KEY)throw Error('Real project drafting is disabled or the existing provider is not configured');
 const claim=await claimMissionStep(project,id,revision,'model');if(!claim.ok)return claim;
 let received=false;
 try{
  const remaining=Math.min(45000,new Date(claim.deadline).getTime()-Date.now());if(remaining<1)throw Error('Mission deadline reached');
  const answer=await provider(draftMessages(claim),claim.limits.maxOutputTokens,AbortSignal.timeout(remaining));received=true;
  const draft=parseDraft(answer.text,claim);const result=await finishMissionStep(project,id,revision,claim.token,{status:'draft',...draft,model:answer.model});return {ok:true,stepId:claim.step.id,...result,modelCallsReserved:1};
 }catch{
  const status=received?'failed':'unknown';await finishMissionStep(project,id,revision,claim.token,{status,unresolved:[received?'Model response could not be accepted; review evidence and output format before explicit recovery.':'Provider outcome uncertain; owner reconciliation required. No automatic retry.']});return {ok:false,status,reason:received?'Draft validation failed':'Provider outcome uncertain; review the held step'};
 }
}
