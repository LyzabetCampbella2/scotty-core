import {test} from 'node:test';import assert from 'node:assert/strict';
import {StagingPostgresWorkspaceStore} from './workspace-postgres-staging.mjs';
const fake=async()=>[];fake.begin=async fn=>fn(Object.assign(async()=>[],{json:x=>x}));
test('explicit staging approval required',()=>assert.throws(()=>new StagingPostgresWorkspaceStore(fake)));
test('cannot use invalid keys',async()=>{const store=new StagingPostgresWorkspaceStore(fake,{stagingConfirmed:true});await assert.rejects(store.read('bad'));await assert.rejects(store.read('["project","other","id"]'));});
test('prefix listing requires scoped project and kind',async()=>{const store=new StagingPostgresWorkspaceStore(fake,{stagingConfirmed:true});await assert.rejects(store.readPrefix(''));await assert.rejects(store.readPrefix('["project","audit",'));});
test('valid scoped empty reads return null and empty list',async()=>{const store=new StagingPostgresWorkspaceStore(fake,{stagingConfirmed:true});assert.equal(await store.read('["synthetic","assignment","one"]'),null);assert.deepEqual(await store.readPrefix('["synthetic","assignment",'),[]);});
test('only audit kind accepts append',async()=>{const store=new StagingPostgresWorkspaceStore(fake,{stagingConfirmed:true});await assert.rejects(store.transaction(tx=>tx.append('["synthetic","assignment","one"]',{event:'x'})));});
