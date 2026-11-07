import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reviewLedgerReadiness,REVIEW_SCHEMA_VERSION} from './activepieces-review-readiness.mjs';
const migration=fs.readFileSync(new URL('./activepieces-review-ledger-v1.sql',import.meta.url),'utf8');
function mockDb({missingAudit=false,brokenConstraint=false,missingColumn=false}={}){
 let queried=0;
 const parse=(name)=>{
   const m=migration.match(new RegExp('CREATE TABLE IF NOT EXISTS '+name+' \\(([\\s\\S]*?)\\);','i'));
   if(!m)throw Error('Missing source table '+name);
   return 'CREATE TABLE '+name+' ('+m[1]+')';
 };
 const ownerTable=parse('scotty_activepieces_review_requests_v1');
 const auditTable=parse('scotty_activepieces_review_audit_v1');
 return {
   batch:async()=>{throw Error('Do not mutate in readiness probe')},
   get queries(){return queried},
   prepare(sql){
     queried++;
     if(sql.includes('sqlite_master')){
       return {all:async()=>({results:[
         {name:'scotty_activepieces_review_requests_v1',sql:brokenConstraint?ownerTable.replace("CHECK(status IN","NO_CHECK(status IN"):ownerTable},
         ...(missingAudit?[]:[{name:'scotty_activepieces_review_audit_v1',sql:auditTable}])
       ]})};
     }
     if(missingColumn && sql.includes('scotty_activepieces_review_requests_v1'))throw Error('Column missing');
     if(sql.includes('SELECT') && sql.includes('LIMIT 0'))return {all:async()=>({results:[]})};
     throw Error('Unexpected query or attempted read of review records');
   }
 };
}
test('unbound D1 returns disabled, non-authorizing readiness',async()=>{
 const r=await reviewLedgerReadiness(null);
 assert.equal(r.ready,false);
 assert.equal(r.reason,'ISOLATED_D1_BINDING_UNAVAILABLE');
 assert.equal(r.canExecute,false);assert.equal(r.changesMade,0);
 assert.equal(r.schemaVersion,REVIEW_SCHEMA_VERSION);
});
test('schema-only check is read-only and never treats schema presence as approval',async()=>{
 const db=mockDb();
 const r=await reviewLedgerReadiness(db);
 assert.equal(r.ready,true);
 assert.equal(r.approvalsVerified,0);
 assert.equal(r.canExecute,false);
 assert.equal(r.changesMade,0);assert.equal(r.modelCalls,0);
 assert.equal(db.queries,3);
});
test('missing or modified migration metadata is rejected safely',async()=>{
 for(const options of [{missingAudit:true},{brokenConstraint:true},{missingColumn:true}]){
   const r=await reviewLedgerReadiness(mockDb(options));
   assert.equal(r.ready,false);assert.equal(r.canExecute,false);
 }
});
