import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({Date});vm.runInContext(fs.readFileSync(new URL('../public/call-contacts-core.js',import.meta.url),'utf8'),c);const core=c.SCOTTYCallContactsCore;
test('contacts validate methods, numbers, aliases and local metadata',()=>{
 const a=core.validate({id:'a',name:'  Alex  Smith ',aliases:'boss, boss, A',method:'jitsi',favorite:true});assert.equal(a.name,'Alex Smith');assert.equal(a.aliases.length,2);assert.equal(a.favorite,true);
 assert.throws(()=>core.validate({name:'Alex',method:'telephone'}),/number/);assert.throws(()=>core.validate({name:'Alex',phone:'javascript:alert(1)'}),/number/);assert.throws(()=>core.validate({name:'Alex',method:'whatsapp'}),/Choose/);
});
test('exact names and nicknames never fuzzy match or choose an ambiguous person',()=>{
 const contacts=[core.validate({id:'a',name:'Alex',aliases:'boss'}),core.validate({id:'b',name:'Alice',aliases:'boss'})];assert.equal(core.resolve(contacts,'Boss').length,2);assert.equal(core.resolve(contacts,'alex').length,1);assert.equal(core.resolve(contacts,'Al').length,0);
});
test('approval is frozen to the exact identity, destination and method and expires',()=>{
 const contact=core.validate({id:'a',name:'Alex',phone:'+15551234567',method:'telephone'}),p={id:'a',snapshot:core.snapshot(contact),created:1000};assert.equal(core.approval(p,[contact],1001),contact);assert.equal(core.approval(p,[{...contact,phone:'+15557654321'}],1001),null);assert.equal(core.approval(p,[{...contact,method:'jitsi'}],1001),null);assert.equal(core.approval(p,[contact],121001),null);assert.equal(core.approval(p,[],1001),null);assert.equal(core.approval(null,[contact]),null);
});
test('contact voice commands are explicit and preserve canvas and Scotty call controls',()=>{
 for(const [text,type]of [['Scotty, save internet contact Alex','save'],['nickname Alex as boss','alias'],['use Jitsi for Alex','method'],['favorite Alex','favorite'],['call boss','request'],['confirm call','confirm'],['prepare call with Alex','prepare'],['show live captions','captions'],['set call goal to Review the project','brief']])assert.equal(core.parse(text)?.type,type);
 for(const text of ['call selected','call those agents','call Scotty','perhaps call Alex later','start Jitsi audio room','approve','yes'])assert.equal(core.parse(text),null);
});
