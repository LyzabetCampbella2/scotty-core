import {test,expect} from 'bun:test';
import {missionSpec} from './project-mission-model.ts';
const step=(id:string,dependsOn:string[]=[])=>({id,agentId:'agent-12',instruction:'Research',deliverable:'Draft',sourceIds:[],dependsOn});
test('reject unknown prerequisites, self edges and multi-step cycles',()=>{
 for(const steps of [[step('a',['missing'])],[step('a',['a'])],[step('a',['b']),step('b',['a'])]])expect(()=>missionSpec({goal:'Test',steps})).toThrow();
});
test('reject duplicate step identities and external actions',()=>{
 expect(()=>missionSpec({goal:'Test',steps:[step('a'),step('a')]})).toThrow();
 expect(()=>missionSpec({goal:'Test',steps:[{...step('a'),action:'email'}]})).toThrow();
});
test('valid dependencies retain explicit source selection without adding permissions',()=>{
 const spec=missionSpec({goal:'Test',steps:[step('a'),step('b',['a'])]});expect(spec.steps[1].dependsOn).toEqual(['a']);expect(spec.steps[0].sourceIds).toEqual([]);
});
