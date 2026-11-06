import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RIKER_ID,rikerDefaults,proposeRikerMemory,reviewRikerMemory,canRecallRikerMemory,rikerCheckInPlan,buildRikerBrain} from './riker-brain.mjs';
const access={ownerVerified:true,authorizedProjectIds:['p1']};
const bio={projects:[{id:'p1',name:'Visible'},{id:'p2',name:'Restricted'}],
 activity:[{eventKey:'question:one',kind:'question',title:'Question',source:'owner-assigned',projectId:null},
 {eventKey:'mission:one',kind:'mission',title:'Private assignment',source:'verified-run',projectId:'p2'}],
 suggestedPartners:[{agentId:'a',name:'A'}],
 assignedTeammates:[{agentId:'b',name:'B',sharedProjects:1}],
 verifiedCollaborators:[{agentId:'c',name:'C',verifiedMissions:1}]};
test('Riker has before-task and before-project checks, no invented times',()=>{
 assert.equal(rikerDefaults().beforeNewTask,true);
 assert.equal(rikerDefaults().beforeNewProject,true);
 assert.equal(rikerDefaults().extraCheckIns,null);
 assert.deepEqual(rikerCheckInPlan({date:'2026-11-06'}).requestedCheckIns,[]);
 assert.deepEqual(rikerCheckInPlan({date:'2026-11-06',briefing:true,extraTimes:['13:15','09:00','09:00']}).requestedCheckIns,['09:00','13:15']);
 assert.deepEqual(rikerCheckInPlan({date:'2026-11-06',briefing:false,extraTimes:['13:15']}).requestedCheckIns,[]);
});
test('Memory needs source, scope and explicit owner approval before recall',()=>{
 assert.throws(()=>proposeRikerMemory({category:'project',scope:'project',text:'x',source:'owner'}),/PROJECT_ID/);
 assert.throws(()=>proposeRikerMemory({category:'mission',scope:'network',text:'x',source:'owner'}),/NETWORK/);
 const proposal=proposeRikerMemory({category:'owner_preference',scope:'private',text:'one preference',source:'owner briefing'});
 assert.equal(proposal.agentId,RIKER_ID);assert.equal(proposal.status,'pending');
 assert.equal(canRecallRikerMemory(proposal,{ownerVerified:true}),false);
 assert.throws(()=>reviewRikerMemory(proposal,{decision:'approved'}),/OWNER_AUTHORIZATION/);
 const approved=reviewRikerMemory(proposal,{decision:'approved',ownerVerified:true});
 assert.equal(canRecallRikerMemory(approved,{ownerVerified:true}),true);
 assert.equal(canRecallRikerMemory(reviewRikerMemory(proposal,{decision:'rejected',ownerVerified:true}),{ownerVerified:true}),false);
});
test('Revoked project, network and sensitive content stay inaccessible',()=>{
 const approved={agentId:RIKER_ID,status:'approved',scope:'project',projectId:'p2',text:'project content'};
 assert.equal(canRecallRikerMemory(approved,{ownerVerified:true,projectIds:['p1']}),false);
 assert.equal(canRecallRikerMemory({...approved,projectId:'p1'},{ownerVerified:true,projectIds:['p1']}),true);
 assert.equal(canRecallRikerMemory({...approved,scope:'network'},{ownerVerified:true,projectIds:['p1']}),false);
 assert.equal(canRecallRikerMemory({...approved,scope:'private',sensitivity:'sensitive'},{ownerVerified:true}),false);
});
test('Current portfolio activity and verified collaborators are separate from suggestions',()=>{
 const b=buildRikerBrain({bio,permissions:access,ownerPreferences:{preferredAddress:'Example Owner',
   preferredCollaborators:[{agentId:'d',name:'D'}],morningBriefingDone:true,extraTimes:['11:45']},date:'2026-11-06'});
 assert.deepEqual(b.projects.map(p=>p.id),['p1']);
 assert.deepEqual(b.assignments.map(a=>a.id),['question:one']);
 assert.equal(b.collaborators.preferred.length,1);
 assert.equal(b.collaborators.suggested.length,1);
 assert.equal(b.collaborators.assignedTeammates.length,1);
 assert.equal(b.collaborators.verifiedCollaborators.length,1);
 assert.deepEqual(b.checkIns.requestedCheckIns,['11:45']);
 assert.match(b.instructions,/Example Owner/);
 const fresh=buildRikerBrain({bio:{...bio,projects:[...bio.projects,{id:'p3',name:'New'}]},
  permissions:{ownerVerified:true,authorizedProjectIds:['p1','p3']},date:'2026-11-06'});
 assert.deepEqual(fresh.projects.map(p=>p.id),['p1','p3']);
});
test('No verified owner means no project, activity, preference or memory disclosed',()=>{
 const b=buildRikerBrain({bio,permissions:{ownerVerified:false,authorizedProjectIds:['p1']},
  ownerPreferences:{preferredAddress:'Private Name',morningBriefingDone:true,extraTimes:['10:00']},
  memories:[{agentId:RIKER_ID,status:'approved',scope:'private',text:'secret'}],date:'2026-11-06'});
 assert.deepEqual(b.projects,[]);assert.deepEqual(b.assignments,[]);
 assert.deepEqual(b.collaborators.suggested,[]);assert.deepEqual(b.memory.recalled,[]);
 assert.deepEqual(b.checkIns.requestedCheckIns,[]);
 assert.doesNotMatch(b.instructions,/Private Name/);
});
