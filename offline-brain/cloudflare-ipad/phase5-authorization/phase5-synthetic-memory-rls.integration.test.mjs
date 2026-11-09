/**
 * Real disposable PostgreSQL RLS tests. No SCOTTY database or live agent memory.
 * The only fixture content is fake strings prefixed with SYN-.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';

const DB='scotty_phase5_synthetic_test';
if(process.env.P5_CI_DISPOSABLE_POSTGRES!=='YES_EXACT_LOOPBACK_FIXTURE')
  throw Error('DISPOSABLE_POSTGRES_OPT_IN_REQUIRED');
function url(name,login){
 const raw=process.env[name];
 if(!raw)throw Error('MISSING_DISPOSABLE_ROLE_URL');
 const u=new URL(raw);
 if(u.protocol!=='postgres:'||u.hostname!=='127.0.0.1'||u.port!=='5432'||
    u.pathname!=='/'+DB||decodeURIComponent(u.username)!==login||
    !u.password||u.search||u.hash)throw Error('REFUSING_UNKNOWN_POSTGRES_TARGET');
 return raw;
}
const admin=postgres(url('P5_CI_ADMIN_URL','scotty_p5_admin'),{max:2,ssl:false,connect_timeout:5});
const pulse=postgres(url('P5_CI_AGENT_PULSE_URL','scotty_p5_agent_pulse'),{max:2,ssl:false,connect_timeout:5});
const iris=postgres(url('P5_CI_AGENT_IRIS_URL','scotty_p5_agent_iris'),{max:2,ssl:false,connect_timeout:5});
const pulseOther=postgres(url('P5_CI_AGENT_PULSE_OTHER_URL','scotty_p5_agent_pulse_other'),{max:2,ssl:false,connect_timeout:5});
const unmapped=postgres(url('P5_CI_AGENT_UNMAPPED_URL','scotty_p5_agent_unmapped'),{max:2,ssl:false,connect_timeout:5});
const all=[admin,pulse,iris,pulseOther,unmapped];
const read=async client=>(await client`
 select memory_id from scotty_p5_synthetic_memory_items order by memory_id`
 ).map(row=>row.memory_id);

test('disposable PostgreSQL per-agent memory RLS isolation',async t=>{
 try{
  const db=await admin`select current_database() as db, current_user as who`;
  assert.equal(db[0].db,DB);assert.equal(db[0].who,'scotty_p5_admin');
  await admin`insert into scotty_p5_synthetic_memory_identity_acl
    (login_name,project_id,agent_id,active) values
    ('scotty_p5_agent_pulse','synthetic','agent-creative-pulse',true),
    ('scotty_p5_agent_iris','synthetic','agent-creative-iris',true),
    ('scotty_p5_agent_pulse_other','SYN-PROJECT-OTHER','agent-creative-pulse',true)`;
  await admin`insert into scotty_p5_synthetic_memory_items
    (memory_id,project_id,owner_agent_id,memory_scope,data_class,payload) values
    ('SYN-MEM-PULSE-A','synthetic','agent-creative-pulse','individual','synthetic-only','SYN-FAKE-PULSE-NOTE'),
    ('SYN-MEM-IRIS-A','synthetic','agent-creative-iris','individual','synthetic-only','SYN-FAKE-IRIS-NOTE'),
    ('SYN-MEM-PULSE-OTHER','SYN-PROJECT-OTHER','agent-creative-pulse','individual','synthetic-only','SYN-FAKE-OTHER-PROJECT'),
    ('SYN-MEM-PULSE-B','synthetic','agent-creative-pulse','individual','synthetic-only','SYN-SECOND-PULSE-NOTE')`;

  await t.test('memory table has FORCE ROW LEVEL SECURITY enabled',async()=>{
   const r=await admin`select relrowsecurity,relforcerowsecurity from pg_class where oid='public.scotty_p5_synthetic_memory_items'::regclass`;
   assert.equal(r[0].relrowsecurity,true);assert.equal(r[0].relforcerowsecurity,true);
  });
  await t.test('Pulse sees only its own synthetic-project individual memory',async()=>{
   assert.deepEqual(await read(pulse),['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B']);
  });
  await t.test('Iris sees only its own memory even inside the same project',async()=>{
   assert.deepEqual(await read(iris),['SYN-MEM-IRIS-A']);
  });
  await t.test('separate project identity cannot read same agent in another project',async()=>{
   assert.deepEqual(await read(pulseOther),['SYN-MEM-PULSE-OTHER']);
  });
  await t.test('unmapped database identity cannot read memory',async()=>{
   assert.deepEqual(await read(unmapped),[]);
  });
  await t.test('direct cross-agent SELECT by known ID returns no rows',async()=>{
   const r=await pulse`select payload from scotty_p5_synthetic_memory_items
     where memory_id='SYN-MEM-IRIS-A'`;
   assert.equal(r.length,0);
  });
  await t.test('direct cross-project SELECT by known ID returns no rows',async()=>{
   const r=await pulse`select payload from scotty_p5_synthetic_memory_items
     where memory_id='SYN-MEM-PULSE-OTHER'`;
   assert.equal(r.length,0);
  });
  await t.test('runtime has no access to identity-to-memory ACL table',async()=>{
   await assert.rejects(pulse`select * from scotty_p5_synthetic_memory_identity_acl`,
      e=>e?.code==='42501');
  });
  await t.test('client-settable session variables cannot impersonate another agent',async()=>{
   await pulse.begin(async tx=>{
    await tx`select set_config('scotty.p5_agent_id','agent-creative-iris',true)`;
    await tx`select set_config('scotty.p5_project_id','SYN-PROJECT-OTHER',true)`;
    const ids=(await tx`select memory_id from scotty_p5_synthetic_memory_items order by memory_id`).map(r=>r.memory_id);
    assert.deepEqual(ids,['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B']);
   });
  });
  await t.test('Pulse cannot SET ROLE to Iris without role membership',async()=>{
   await assert.rejects(pulse.unsafe('SET ROLE scotty_p5_agent_iris'),e=>e?.code==='42501');
   assert.deepEqual(await read(pulse),['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B']);
  });
  await t.test('RLS bypass attempt using row_security off is rejected',async()=>{
   await assert.rejects(pulse.begin(async tx=>{
    await tx`set local row_security = off`;
    await tx`select memory_id from scotty_p5_synthetic_memory_items`;
   }),e=>e?.code==='42501');
  });
  await t.test('memory principal roles cannot insert, update, or delete',async()=>{
   await assert.rejects(pulse`update scotty_p5_synthetic_memory_items set payload='SYN-CHANGED' where memory_id='SYN-MEM-PULSE-A'`,e=>e?.code==='42501');
   await assert.rejects(pulse`delete from scotty_p5_synthetic_memory_items where memory_id='SYN-MEM-PULSE-A'`,e=>e?.code==='42501');
   await assert.rejects(pulse`insert into scotty_p5_synthetic_memory_items
     (memory_id,project_id,owner_agent_id,memory_scope,data_class,payload)
     values ('SYN-MEM-INJECT','synthetic','agent-creative-pulse','individual','synthetic-only','SYN-FORGED')`,
     e=>e?.code==='42501');
  });
  await t.test('revoking a synthetic ACL entry denies subsequent reads immediately',async()=>{
   await admin`update scotty_p5_synthetic_memory_identity_acl set active=false
     where login_name='scotty_p5_agent_pulse' and project_id='synthetic'`;
   try{assert.deepEqual(await read(pulse),[]);}
   finally{
    await admin`update scotty_p5_synthetic_memory_identity_acl set active=true
      where login_name='scotty_p5_agent_pulse' and project_id='synthetic'`;
   }
   assert.deepEqual(await read(pulse),['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B']);
  });
  await t.test('simultaneous reads from separate pools remain isolated',async()=>{
   const responses=await Promise.all([read(pulse),read(iris),read(pulseOther),read(unmapped)]);
   assert.deepEqual(responses,[
    ['SYN-MEM-PULSE-A','SYN-MEM-PULSE-B'],['SYN-MEM-IRIS-A'],['SYN-MEM-PULSE-OTHER'],[]
   ]);
  });
  await t.test('all memory rows contain only synthetic test values',async()=>{
   const rows=await admin`select memory_id,data_class,payload,memory_scope from scotty_p5_synthetic_memory_items`;
   assert.equal(rows.length,4);
   assert.ok(rows.every(row=>row.memory_id.startsWith('SYN-MEM-')&&
      row.data_class==='synthetic-only'&&row.payload.startsWith('SYN-')&&row.memory_scope==='individual'));
  });
  await t.test('departmental and shared memory scopes are denied by schema',async()=>{
   for(const scope of ['departmental','shared']){
    await assert.rejects(admin`insert into scotty_p5_synthetic_memory_items
      (memory_id,project_id,owner_agent_id,memory_scope,data_class,payload)
      values (${'SYN-MEM-'+scope.toUpperCase()},'synthetic','agent-creative-pulse',${scope},'synthetic-only','SYN-NOT-PERMITTED')`,
      e=>e?.code==='23514');
   }
  });
  await t.test('production-classified memory records cannot enter synthetic tables',async()=>{
   await assert.rejects(admin`insert into scotty_p5_synthetic_memory_items
     (memory_id,project_id,owner_agent_id,memory_scope,data_class,payload)
     values ('SYN-MEM-RESTRICTED','synthetic','agent-creative-pulse','individual','restricted','SYN-NOT-PERMITTED')`,
     e=>e?.code==='23514');
  });
  await t.test('agent database roles cannot bypass row security or become superusers',async()=>{
   const rows=await admin`select rolname,rolbypassrls,rolsuper from pg_roles
     where rolname like 'scotty_p5_agent_%'`;
   assert.equal(rows.length,4);
   assert.ok(rows.every(row=>row.rolbypassrls===false&&row.rolsuper===false));
  });
  await t.test('agent role cannot change its own ACL membership or activation',async()=>{
   await assert.rejects(pulse`update scotty_p5_synthetic_memory_identity_acl
     set active=true where login_name='scotty_p5_agent_pulse'`,
     e=>e?.code==='42501');
  });
 }finally{
  await Promise.allSettled(all.map(db=>db.end({timeout:5})));
 }
});
