export type MissionStep={id:string;agentId:string;instruction:string;deliverable:string;dependsOn:string[];sourceIds:string[]};
export type MissionSpec={goal:string;steps:MissionStep[]};
const identifier=(x:unknown)=>typeof x==='string'&&/^[\w-]{1,160}$/.test(x);
const prose=(x:unknown,max:number)=>typeof x==='string'&&x.trim().length>0&&x.length<=max;
export function missionSpec(input:any):MissionSpec{
 if(!input||!prose(input.goal,12000)||!Array.isArray(input.steps)||input.steps.length<1||input.steps.length>8)throw Error('A goal and 1 to 8 internal draft steps are required');
 const steps:MissionStep[]=input.steps.map((s:any)=>{
  if(!s||!identifier(s.id)||!identifier(s.agentId)||!prose(s.instruction,4000)||!prose(s.deliverable,1000)||!Array.isArray(s.dependsOn)||!Array.isArray(s.sourceIds)||s.dependsOn.length>8||s.sourceIds.length>30||![...s.dependsOn,...s.sourceIds].every(identifier))throw Error('Invalid step, dependency or source');
  if(s.action&&s.action!=='internal_draft')throw Error('Only internal draft actions are supported');
  return {id:s.id,agentId:s.agentId,instruction:s.instruction.trim(),deliverable:s.deliverable.trim(),dependsOn:[...new Set<string>(s.dependsOn)],sourceIds:[...new Set<string>(s.sourceIds)]};
 });
 if(new Set(steps.map(s=>s.id)).size!==steps.length)throw Error('Duplicate step IDs');
 const marks=new Map<string,number>();
 const visit=(id:string)=>{if(marks.get(id)===1)throw Error('Dependency cycle');if(marks.get(id)===2)return;const s=steps.find(s=>s.id===id);if(!s)throw Error('Unknown dependency');marks.set(id,1);s.dependsOn.forEach(visit);marks.set(id,2);};
 steps.forEach(s=>visit(s.id));return {goal:input.goal.trim(),steps};
}
