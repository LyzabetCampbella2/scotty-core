import {test,expect} from "bun:test";
import postgres from "postgres";

// Runs only against a disposable CI Postgres instance; never use a production URL.
if(process.env.SCOTTY_BRAIN_TEST_DB!=="disposable")throw Error("Refusing to run integration tests outside disposable Postgres CI");
if(!/^postgres(?:ql)?:\/\/[^/]+@(?:127\.0\.0\.1|localhost):5432\/scotty_brain_ci(?:\?|$)/.test(process.env.DATABASE_URL||""))throw Error("DATABASE_URL is not the expected local CI database");
process.env.SCOTTY_BRAIN_DB_SSL="disable";
const sql=postgres(process.env.DATABASE_URL!,{ssl:false});
await sql`create table scotty_agents (
 id text primary key, name text not null, department text not null, sort_order int not null,
 updated_at timestamptz not null default now()
)`;
for(let i=0;i<128;i++){
 const chief=i<12;
 await sql`insert into scotty_agents(id,name,department,sort_order) values(${chief?"chief-"+i:"agent-"+i},${chief?"Chief "+i:"Agent "+i},${chief?"Command":"Research"},${i})`;
}
const registryBefore=await sql`select id,name,department,sort_order from scotty_agents order by sort_order`;
const {createBrain,getBrain,listBrains,propose,listProposals,review,listMemories}=await import("./postgres-store.ts");

test("all 128 existing roster entries are visible without importing or replacing",async()=>{
 const brains=await listBrains();
 expect(brains).toHaveLength(128);
 expect(brains[0]?.id).toBe("chief-0");
 expect(brains[127]?.id).toBe("agent-127");
});

test("approved learning is saved once; rejected learning is never memorized",async()=>{
 await createBrain({id:"chief-0",name:"Chief 0",department:"Command",specialty:"Planning",instructions:"Owner-approved learning only",knowledgeSources:["Test reference"]});
 expect((await getBrain("chief-0"))?.specialty).toBe("Planning");
 const yes=await propose("chief-0",{text:"An approved test fact",source:"CI verified fixture",scope:"private"});
 const no=await propose("chief-0",{text:"An intentionally rejected test fact",source:"CI unverified fixture",scope:"private"});
 expect((await listProposals()).filter(x=>x.status==="pending")).toHaveLength(2);
 expect((await review(yes.id,"approved","owner")).status).toBe("approved");
 expect((await review(no.id,"rejected","owner")).status).toBe("rejected");
 const owner=await listMemories({id:"owner",role:"owner"},"chief-0");
 expect(owner.filter(x=>x.text==="An approved test fact")).toHaveLength(1);
 expect(owner.some(x=>x.text==="An intentionally rejected test fact")).toBe(false);
 const stranger=await listMemories({id:"agent-12",role:"agent",department:"Research"},"chief-0");
 expect(stranger).toHaveLength(0);
 expect(review(yes.id,"approved","owner")).rejects.toThrow();
 const evidence=await sql`select count(*)::int as n from scotty_brain_memories where proposal_id=${yes.id}`;
 expect(evidence[0].n).toBe(1);
});

test("unknown agent ID is never inserted into roster",async()=>{
 expect(createBrain({id:"invented-chief",name:"Invented",department:"Unknown",specialty:"",instructions:"",knowledgeSources:[]})).rejects.toThrow();
 const after=await sql`select id,name,department,sort_order from scotty_agents order by sort_order`;
 expect(after).toEqual(registryBefore);
 expect(await sql`select count(*)::int as n from scotty_agents`).toEqual([{n:128}]);
});

test("Part 2: grants gate messages and memory sharing, with revocation",async()=>{
 const {grant,revoke,message,share,list,sharedFor}=await import("./collaboration.ts");
 await sql`create table if not exists scotty_projects(id text primary key)`;
 await sql`insert into scotty_projects(id) values('book-test') on conflict do nothing`;
 expect(message("book-test","chief-0","agent-12","without a grant")).rejects.toThrow();
 await grant("book-test","chief-0");await grant("book-test","agent-12");
 const sent=await message("book-test","chief-0","agent-12","Approved owner-mediated handoff");
 expect(sent.id).toBeTruthy();
 const proposed=await propose("chief-0",{text:"Project-only reviewed reference",source:"CI fixture",scope:"project",projectId:"book-test"});
 await review(proposed.id,"approved","owner");
 const found=await sql`select id from scotty_brain_memories where proposal_id=${proposed.id}`;
 await share("book-test",found[0].id,"agent-12");
 expect((await sharedFor("book-test","agent-12")).length).toBe(1);
 await revoke("book-test","agent-12");
 expect(sharedFor("book-test","agent-12")).rejects.toThrow();
 await grant("book-test","agent-12");
 expect((await sharedFor("book-test","agent-12")).length).toBe(0);
 const snapshot=await list("book-test");expect(snapshot.messages.length).toBe(1);
 expect(snapshot.audit.some((x:any)=>x.action==="revoke")).toBe(true);
});
