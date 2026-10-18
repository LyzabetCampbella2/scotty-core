export type MissionStep={id:string;agentId:string;instruction:string;deliverable:string;dependsOn:string[];sourceIds:string[];evidenceIds?:string[];reviewBeforeNext?:boolean;chiefReview?:boolean};
export type Coordination={leadChiefId:string;supportingChiefIds:string[];handoffs:{fromStep:string;toStep:string;requestId:string}[];priority:number;limits:{maxAttempts:number;maxElapsedMs:number;maxModelCalls:number;maxInputChars?:number;maxOutputTokens?:number}};
export type MissionSpec={goal:string;steps:MissionStep[];coordination?:Coordination};
const identifier=(x:unknown)=>typeof x==='string'&&/^[\w-]{1,160}$/.test(x);
const prose=(x:unknown,max:number)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
export function missionSpec(input:any):MissionSpec{
 if(!input||!prose(input.goal,12000)||!Array.isArray(input.steps)||input.steps.length<1||input.steps.length>8)throw Error('A goal and 1 to 8 internal draft steps are required');
 const steps:MissionStep[]=input.steps.map((s:any)=>{
  if(!s||!identifier(s.id)||!identifier(s.agentId)||!prose(s.instruction,4000)||!prose(s.deliverable,1000)||!Array.isArray(s.dependsOn)||!Array.isArray(s.sourceIds)||s.dependsOn.length>8||s.sourceIds.length>30||![...s.dependsOn,...s.sourceIds].every(identifier))throw Error('Invalid step, dependency or source');
  if(s.action&&s.action!=='internal_draft')throw Error('Only internal draft actions are supported');
  if(s.evidenceIds&&(!Array.isArray(s.evidenceIds)||s.evidenceIds.length>20||!s.evidenceIds.every(identifier)))throw Error('Invalid selected project evidence');
  return {id:s.id,agentId:s.agentId,instruction:s.instruction.trim(),deliverable:s.deliverable.trim(),dependsOn:[...new Set<string>(s.dependsOn)],sourceIds:[...new Set<string>(s.sourceIds)],...(s.evidenceIds?.length?{evidenceIds:[...new Set<string>(s.evidenceIds)]}:{}),...(s.reviewBeforeNext===true?{reviewBeforeNext:true}:{}),...(s.chiefReview===true?{chiefReview:true}:{})};
 });
 if(new Set(steps.map(s=>s.id)).size!==steps.length)throw Error('Duplicate step IDs');
 const marks=new Map<string,number>();
 const visit=(id:string)=>{if(marks.get(id)===1)throw Error('Dependency cycle');if(marks.get(id)===2)return;const s=steps.find(s=>s.id===id);if(!s)throw Error('Unknown dependency');marks.set(id,1);s.dependsOn.forEach(visit);marks.set(id,2);};
 steps.forEach(s=>visit(s.id));
 let coordination:Coordination|undefined;
 if(input.coordination){const c=input.coordination,l=c.limits||{};
  if(!identifier(c.leadChiefId)||!Array.isArray(c.supportingChiefIds)||!c.supportingChiefIds.every(identifier)||new Set([c.leadChiefId,...c.supportingChiefIds]).size!==c.supportingChiefIds.length+1||!Array.isArray(c.handoffs)||c.handoffs.length>56)throw Error('Invalid chief coordination');
  const maxAttempts=l.maxAttempts??1,maxElapsedMs=l.maxElapsedMs??120000;
  if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>2||!Number.isInteger(maxElapsedMs)||maxElapsedMs<1000||maxElapsedMs>300000||!Number.isInteger(l.maxModelCalls??0)||(l.maxModelCalls??0)<0||(l.maxModelCalls??0)>8)throw Error('Development limits allow 1–2 attempts, 1–300 seconds and 0–8 model calls');
  if(l.maxModelCalls>0&&(!Number.isInteger(l.maxInputChars)||l.maxInputChars<1000||l.maxInputChars>24000||!Number.isInteger(l.maxOutputTokens)||l.maxOutputTokens<128||l.maxOutputTokens>1200))throw Error('Real drafts require explicit input and output limits');
  if(!Number.isInteger(c.priority??0)||(c.priority??0)<0||(c.priority??0)>3)throw Error('Priority must be 0 to 3');
  const handoffs=c.handoffs.map((h:any)=>{if(!identifier(h.fromStep)||!identifier(h.toStep)||!identifier(h.requestId)||!steps.find(s=>s.id===h.toStep)?.dependsOn.includes(h.fromStep))throw Error('Handoff must reference a dependency');return {fromStep:h.fromStep,toStep:h.toStep,requestId:h.requestId};});
  if(!steps.some(s=>s.agentId===c.leadChiefId&&steps.filter(x=>x.agentId!==c.leadChiefId).every(x=>s.dependsOn.includes(x.id))))throw Error('Lead chief review must depend on the other assigned authors');
  coordination={leadChiefId:c.leadChiefId,supportingChiefIds:[...c.supportingChiefIds],handoffs,priority:c.priority??0,limits:{maxAttempts,maxElapsedMs,maxModelCalls:l.maxModelCalls??0,...(l.maxModelCalls>0?{maxInputChars:l.maxInputChars,maxOutputTokens:l.maxOutputTokens}:{})}};
 }
 return {goal:input.goal.trim(),steps,...(coordination?{coordination}:{})};
}
