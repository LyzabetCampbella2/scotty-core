/** Pure Phase 5 lifecycle policy. Actor identity MUST come from verified server context.
 * This module never authenticates a client-supplied actor, sends data, or executes tools.
 */
export type TaskState='proposed'|'approved'|'assigned'|'in_review'|'needs_revision'|'accepted'|'closed'|'revoked';
export type Actor={role:'owner'|'agent'|'chief';id:string};
export type Action='approve'|'assign'|'submit'|'request_revision'|'accept'|'close'|'revoke'|'reassign';
export type Task={id:string;projectId:string;title:string;agentId:string|null;chiefId:string;state:TaskState;version:number;approvalRef:string|null};
export type TaskEvent={event:string;taskId:string;projectId:string;actorId:string;actorRole:Actor['role'];version:number;from:TaskState|null;to:TaskState;agentId:string|null;approvalRef:string|null;timestamp:string};
export type Context={actor:Actor;projectId:string;expectedVersion:number;now:string;proposedAgentId?:string;approvalRef?:string;projectMembers:ReadonlySet<string>;canonicalIds:ReadonlySet<string>;activeChiefs:ReadonlySet<string>};
export class Denied extends Error{readonly reason:string;constructor(reason:string){super('phase5_denied:'+reason);this.reason=reason;}}
const id=/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const safe=(v:unknown):v is string=>typeof v==='string'&&id.test(v);
function requireValidContext(c:Context){
 if(!safe(c.actor.id)||!safe(c.projectId)||!Number.isSafeInteger(c.expectedVersion)||c.expectedVersion<0)throw new Denied('invalid_context');
 if(!Number.isFinite(Date.parse(c.now))||new Date(c.now).toISOString()!==c.now)throw new Denied('invalid_time');
}
function owner(c:Context){if(c.actor.role!=='owner')throw new Denied('owner_required');}
function member(c:Context,idValue:string){if(!safe(idValue)||!c.canonicalIds.has(idValue)||!c.projectMembers.has(idValue))throw new Denied('agent_not_authorized');}
export function proposeTask(input:{id:string;projectId:string;title:string;chiefId:string},c:Context):{task:Task;event:TaskEvent}{
 requireValidContext(c);owner(c);
 if(c.expectedVersion!==0||!safe(input.id)||!safe(input.projectId)||input.projectId!==c.projectId||
    typeof input.title!=='string'||!input.title.trim()||input.title.length>200||!safe(input.chiefId)||
    !c.canonicalIds.has(input.chiefId)||!c.activeChiefs.has(input.chiefId))throw new Denied('proposal_invalid');
 const task:Task={id:input.id,projectId:input.projectId,title:input.title.trim(),agentId:null,chiefId:input.chiefId,state:'proposed',version:1,approvalRef:null};
 return {task,event:{event:'propose',taskId:task.id,projectId:task.projectId,actorId:c.actor.id,actorRole:c.actor.role,version:1,from:null,to:'proposed',agentId:null,approvalRef:null,timestamp:c.now}};
}
export function transition(task:Task,action:Action,c:Context):{task:Task;event:TaskEvent}{
 requireValidContext(c);
 if(!safe(task.id)||task.projectId!==c.projectId||task.version!==c.expectedVersion||!Number.isSafeInteger(task.version)||task.version<1)throw new Denied('version_or_project_mismatch');
 if(task.state==='closed'||task.state==='revoked')throw new Denied('terminal_state');
 let next:TaskState;let newAgent=task.agentId;let approvalRef=task.approvalRef;
 switch(action){
  case 'approve':
   owner(c);if(task.state!=='proposed'||!safe(c.approvalRef))throw new Denied('approval_missing_or_wrong_state');
   next='approved';approvalRef=c.approvalRef!;break;
  case 'assign':
   owner(c);if(task.state!=='approved'||!safe(task.approvalRef)||!c.proposedAgentId)throw new Denied('assignment_requires_approval');
   member(c,c.proposedAgentId);newAgent=c.proposedAgentId;next='assigned';break;
  case 'reassign':
   owner(c);if(!['assigned','in_review','needs_revision'].includes(task.state)||!c.proposedAgentId||c.proposedAgentId===task.agentId)throw new Denied('reassignment_invalid');
   member(c,c.proposedAgentId);newAgent=c.proposedAgentId;next='assigned';break;
  case 'submit':
   if(c.actor.role!=='agent'||c.actor.id!==task.agentId||!c.projectMembers.has(c.actor.id)||!['assigned','needs_revision'].includes(task.state))throw new Denied('submission_not_authorized');
   next='in_review';break;
  case 'request_revision':
   if(c.actor.role!=='chief'||c.actor.id!==task.chiefId||task.state!=='in_review')throw new Denied('review_not_authorized');
   next='needs_revision';break;
  case 'accept':
   if(c.actor.role!=='chief'||c.actor.id!==task.chiefId||task.state!=='in_review')throw new Denied('acceptance_not_authorized');
   next='accepted';break;
  case 'close':
   owner(c);if(task.state!=='accepted')throw new Denied('cannot_close_unaccepted_work');
   next='closed';break;
  case 'revoke':
   owner(c);next='revoked';break;
  default:throw new Denied('unknown_action');
 }
 const changed:Task={...task,agentId:newAgent,approvalRef,state:next,version:task.version+1};
 const event:TaskEvent={event:action,taskId:task.id,projectId:task.projectId,actorId:c.actor.id,actorRole:c.actor.role,version:changed.version,from:task.state,to:next,agentId:newAgent,approvalRef,timestamp:c.now};
 return {task:changed,event};
}
/** Only recorded assignment events generate biography history. */
export function biographyRows(events:readonly TaskEvent[],agentId:string,projectId:string){
 if(!safe(agentId)||!safe(projectId))throw new Denied('invalid_biography_scope');
 return events.filter(e=>e.projectId===projectId&&e.agentId===agentId&&e.from!==null&&e.version>0).map(e=>({taskId:e.taskId,projectId:e.projectId,action:e.event,state:e.to,at:e.timestamp,version:e.version}));
}
