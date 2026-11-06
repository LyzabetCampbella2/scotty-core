import {test} from 'node:test';
import assert from 'node:assert/strict';
import {proposeStoredRikerMemory,rikerMemoryReady} from './riker-memory-store.mjs';
const db={prepare(){throw Error('NO_DB')},batch(){throw Error('NO_DB')}};
const base={category:'decision',scope:'private',text:'Example',source:'Synthetic test',validDays:30};
test('migration is required',async()=>{
 assert.equal((await rikerMemoryReady(db)).ready,false);
});
test('owner verification required',async()=>{
 await assert.rejects(()=>proposeStoredRikerMemory(db,base,{}),/OWNER_AUTHORIZATION_REQUIRED/);
});
test('sensitive data cannot be stored in unencrypted D1',async()=>{
 await assert.rejects(()=>proposeStoredRikerMemory(db,{...base,sensitivity:'sensitive'},{ownerVerified:true}),/SENSITIVE_CONTENT_REQUIRES_SEPARATE_ENCRYPTED_STORE/);
});
test('cross-project data cannot be inserted',async()=>{
 await assert.rejects(()=>proposeStoredRikerMemory(db,{...base,scope:'project',projectId:'other'},{ownerVerified:true,authorizedProjectIds:[]}),/PROJECT_ACCESS_REQUIRED/);
});
