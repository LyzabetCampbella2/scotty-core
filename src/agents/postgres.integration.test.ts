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
await sql`create table if not exists scotty_projects(id text primary key)`;
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

test("Part 2: handoff review queue blocks dispatch until owner approval",async()=>{
 const {requestHandoff,pendingRequests,decideRequest}=await import("./collaboration-requests.ts");
 await sql`insert into scotty_projects(id) values('handoff-test') on conflict do nothing`;
 const {grant,list}=await import("./collaboration.ts");
 await grant("handoff-test","chief-0");
 await grant("handoff-test","agent-12");
 const waiting=await requestHandoff("handoff-test","chief-0","agent-12","Review architecture","Only approved project information");
 expect(waiting.status).toBe("pending");
 expect((await list("handoff-test")).messages.length).toBe(0);
 expect((await pendingRequests("handoff-test")).some((x:any)=>x.id===waiting.id)).toBe(true);
 const approved=await decideRequest(waiting.id,"approved");
 expect(approved.delivered).toBe(true);
 expect((await list("handoff-test")).messages.length).toBe(1);
 expect(decideRequest(waiting.id,"approved")).rejects.toThrow();
 const declined=await requestHandoff("handoff-test","chief-0","agent-12","Decline this","Private decision");
 expect((await decideRequest(declined.id,"rejected")).status).toBe("rejected");
 expect((await list("handoff-test")).messages.length).toBe(1);
});

test("Part 2: revoked membership blocks approval without consuming pending request",async()=>{
 const {grant,revoke,list}=await import("./collaboration.ts");
 const {requestHandoff,decideRequest,pendingRequests}=await import("./collaboration-requests.ts");
 await sql`insert into scotty_projects(id) values('revoked-handoff') on conflict do nothing`;
 await grant("revoked-handoff","chief-0");
 await grant("revoked-handoff","agent-12");
 const r=await requestHandoff("revoked-handoff","chief-0","agent-12","Restricted","Grant must still exist at review time");
 await revoke("revoked-handoff","agent-12");
 expect(decideRequest(r.id,"approved")).rejects.toThrow("Project membership was revoked");
 expect((await list("revoked-handoff")).messages).toHaveLength(0);
 expect((await pendingRequests("revoked-handoff")).some((x:any)=>x.id===r.id)).toBe(true);
 await grant("revoked-handoff","agent-12");
 expect((await decideRequest(r.id,"approved")).delivered).toBe(true);
 expect((await list("revoked-handoff")).messages).toHaveLength(1);
});

test("Part 2: project-scoped agent identity cannot impersonate or cross projects",async()=>{
 const {grant}=await import("./collaboration.ts");
 const {issueAgentCredential,authenticateAgent,revokeAgentCredentials}=await import("./agent-credentials.ts");
 const {handleAgentSubmit}=await import("./agent-runtime-api.ts");
 await sql`insert into scotty_projects(id) values('agent-identity-ci'),('different-project-ci') on conflict do nothing`;
 await grant("agent-identity-ci","chief-0");
 await grant("agent-identity-ci","agent-12");
 const issued=await issueAgentCredential("chief-0","agent-identity-ci",5);
 expect(issued.credential.startsWith("scotty_agent_")).toBe(true);
 const header={authorization:"Bearer "+issued.credential,"content-type":"application/json"};
 const authReq=new Request("https://scotty.example/",{headers:header});
 expect((await authenticateAgent(authReq,"agent-identity-ci"))?.agentId).toBe("chief-0");
 expect(await authenticateAgent(authReq,"different-project-ci")).toBeNull();
 process.env.SCOTTY_AGENT_REQUESTS_ENABLED="true";process.env.SCOTTY_AGENT_BRAINS_ENABLED="true";
 const url=new URL("https://scotty.example/api/agent-runtime/projects/agent-identity-ci/requests");
 const reply=await handleAgentSubmit(new Request(url,{method:"POST",headers:header,body:JSON.stringify({senderId:"agent-12",recipientId:"agent-12",title:"Delegated evidence",summary:"Authorized source must come from token"})}),url);
 expect(reply.status).toBe(201);
 const created=await reply.json();
 const rows=await sql`select source_agent_id from scotty_collab_requests where id=${created.request.id}`;
 expect(rows[0].source_agent_id).toBe("chief-0");
 await revokeAgentCredentials("chief-0","agent-identity-ci");
 expect(await authenticateAgent(authReq,"agent-identity-ci")).toBeNull();
 const denied=await handleAgentSubmit(new Request(url,{method:"POST",headers:header,body:JSON.stringify({recipientId:"agent-12",title:"Second",summary:"Must fail"})}),url);
 expect(denied.status).toBe(401);
 delete process.env.SCOTTY_AGENT_REQUESTS_ENABLED;delete process.env.SCOTTY_AGENT_BRAINS_ENABLED;
});

test("Part 2: agent requests are rate limited atomically per project",async()=>{
 const {grant}=await import("./collaboration.ts");
 const {requestHandoff}=await import("./collaboration-requests.ts");
 await sql`insert into scotty_projects(id) values('rate-limited-ci') on conflict do nothing`;
 await grant("rate-limited-ci","chief-0");
 await grant("rate-limited-ci","agent-12");
 for(let i=0;i<20;i++)await requestHandoff("rate-limited-ci","chief-0","agent-12","Request "+i,"Non-sensitive fixture",undefined,true);
 expect(requestHandoff("rate-limited-ci","chief-0","agent-12","Over quota","Should fail",undefined,true)).rejects.toThrow("limit reached");
 const count=await sql`select count(*)::int as n from scotty_collab_requests where project_id='rate-limited-ci'`;
 expect(count[0].n).toBe(20);
});

test("Part 2: shared knowledge includes source provenance and excludes revoked access",async()=>{
 const {grant,share,sharedFor,revoke}=await import("./collaboration.ts");
 await sql`insert into scotty_projects(id) values('provenance-ci') on conflict do nothing`;
 await grant("provenance-ci","chief-0");
 await grant("provenance-ci","agent-12");
 const proposed=await propose("chief-0",{text:"Reviewed provenance detail",source:"Verified source note",scope:"project",projectId:"provenance-ci"});
 await review(proposed.id,"approved","owner");
 const memory=await sql`select id from scotty_brain_memories where proposal_id=${proposed.id}`;
 await share("provenance-ci",memory[0].id,"agent-12");
 const records=await sharedFor("provenance-ci","agent-12");
 expect(records).toHaveLength(1);
 expect(records[0].sourceReference).toBe("Verified source note");
 expect(records[0].approvedBy).toBe("owner");
 expect(records[0].sourceAgentName).toBe("Chief 0");
 await revoke("provenance-ci","agent-12");
 expect(sharedFor("provenance-ci","agent-12")).rejects.toThrow("Project grant required");
});

test("Part 2 completion: regrant never reactivates a revoked credential",async()=>{
 const {grant,revoke}=await import("./collaboration.ts");
 const {issueAgentCredential,authenticateAgent}=await import("./agent-credentials.ts");
 await sql`insert into scotty_projects(id) values('credential-regrant-ci') on conflict do nothing`;
 await grant("credential-regrant-ci","chief-0");
 const issued=await issueAgentCredential("chief-0","credential-regrant-ci",10);
 const req=new Request("https://scotty.example",{headers:{authorization:"Bearer "+issued.credential}});
 expect(await authenticateAgent(req,"credential-regrant-ci")).not.toBeNull();
 await revoke("credential-regrant-ci","chief-0");
 await grant("credential-regrant-ci","chief-0");
 expect(await authenticateAgent(req,"credential-regrant-ci")).toBeNull();
});

test("Part 2 completion: owner notifications expose pending metadata, not sensitive summaries",async()=>{
 const {handleCollaboration}=await import("./collaboration-api.ts");
 const url=new URL("https://scotty.example/api/agent-brains/collaboration-notifications");
 const r=await handleCollaboration(new Request(url),url);
 expect(r.status).toBe(200);
 const b=await r.json();
 expect(typeof b.pendingCount).toBe("number");
 expect(Array.isArray(b.latest)).toBe(true);
 expect(JSON.stringify(b.latest)).not.toContain("summary");
});

test("Part 2 completion: browser cannot issue a runtime agent secret",async()=>{
 const {handleCollaboration}=await import("./collaboration-api.ts");
 const url=new URL("https://scotty.example/api/agent-brains/agent-credentials");
 const r=await handleCollaboration(new Request(url,{method:"POST",headers:{origin:url.origin,"x-scotty-csrf":"1","content-type":"application/json"},body:JSON.stringify({decision:"issue",agentId:"chief-0",projectId:"credential-regrant-ci"})}),url);
 expect(r.status).toBe(403);
 expect(JSON.stringify(await r.json())).not.toContain("scotty_agent_");
});

test("source revocation never resurrects old shares after regrant",async()=>{
 const {grant,revoke,share,sharedFor,list}=await import("./collaboration.ts");
 const p="source-regrant-ci";
 await sql`insert into scotty_projects(id) values(${p})`;
 await grant(p,"chief-0");await grant(p,"agent-12");
 const proposal=await propose("chief-0",{text:"Revocable source memory",source:"CI",scope:"project",projectId:p});
 await review(proposal.id,"approved","owner");
 const [m]=await sql`select id from scotty_brain_memories where proposal_id=${proposal.id}`;
 await share(p,m.id,"agent-12");
 expect(await sharedFor(p,"agent-12")).toHaveLength(1);
 await revoke(p,"chief-0");await grant(p,"chief-0");
 expect(await sharedFor(p,"agent-12")).toHaveLength(0);
 const snapshot=await list(p);
 expect(snapshot.shares[0].revokedAt).not.toBeNull();
 expect(snapshot.audit.every((a:any)=>a.id&&a.createdAt)).toBe(true);
 await share(p,m.id,"agent-12"); // A new explicit owner share is required.
 expect(await sharedFor(p,"agent-12")).toHaveLength(1);
});

test("concurrent reviews deliver once and record one decision",async()=>{
 const {grant,list}=await import("./collaboration.ts");
 const {requestHandoff,decideRequest}=await import("./collaboration-requests.ts");
 const p="review-race-ci";
 await sql`insert into scotty_projects(id) values(${p})`;
 await grant(p,"chief-0");await grant(p,"agent-12");
 const r=await requestHandoff(p,"chief-0","agent-12","One delivery","Review race");
 const outcomes=await Promise.allSettled([decideRequest(r.id,"approved"),decideRequest(r.id,"approved")]);
 expect(outcomes.filter(x=>x.status==="fulfilled")).toHaveLength(1);
 const snapshot=await list(p);
 expect(snapshot.messages).toHaveLength(1);
 expect(snapshot.messages[0].body).toBe("HANDOFF: One delivery\nReview race");
 expect(snapshot.audit.filter((x:any)=>x.action==="request.approve")).toHaveLength(1);
 expect(snapshot.audit.filter((x:any)=>x.action==="request.create")).toHaveLength(1);
});

test("concurrent runtime submissions cannot exceed the project quota",async()=>{
 const {grant}=await import("./collaboration.ts");
 const {requestHandoff}=await import("./collaboration-requests.ts");
 const p="quota-race-ci";
 await sql`insert into scotty_projects(id) values(${p})`;
 await grant(p,"chief-0");await grant(p,"agent-12");
 const results=await Promise.allSettled(Array.from({length:25},(_,i)=>requestHandoff(p,"chief-0","agent-12","Burst "+i,"CI fixture",undefined,true)));
 expect(results.filter(x=>x.status==="fulfilled")).toHaveLength(20);
 expect(results.filter(x=>x.status==="rejected")).toHaveLength(5);
});

test("memory approval queue contains actual approved evidence, rejects private or wrong-source memory",async()=>{
 const {grant}=await import("./collaboration.ts");
 const {requestHandoff,pendingRequests,decideRequest}=await import("./collaboration-requests.ts");
 const p="memory-review-ci";
 await sql`insert into scotty_projects(id) values(${p})`;
 await grant(p,"chief-0");await grant(p,"agent-12");
 const make=async(scope:"private"|"project",projectId?:string)=>{
  const proposal=await propose("chief-0",{text:"Owner must see exact evidence",source:"CI reviewed source",scope,projectId});
  await review(proposal.id,"approved","owner");
  return (await sql`select id from scotty_brain_memories where proposal_id=${proposal.id}`)[0].id;
 };
 const privateId=await make("private");
 await expect(requestHandoff(p,"chief-0","agent-12","Hidden","Reject private",privateId)).rejects.toThrow("not approved");
 const memoryId=await make("project",p);
 await expect(requestHandoff(p,"agent-12","chief-0","Wrong author","Reject wrong source",memoryId)).rejects.toThrow("not approved");
 const request=await requestHandoff(p,"chief-0","agent-12","Evidence","Review before sharing",memoryId);
 const queued=(await pendingRequests(p)).find((x:any)=>x.id===request.id);
 expect(queued.memory_text).toBe("Owner must see exact evidence");
 expect(queued.memory_source).toBe("CI reviewed source");
 expect(queued.memory_approved_by).toBe("owner");
 await decideRequest(request.id,"approved");
});

test("credential revocation is audited without secrets and blocks an already authenticated enqueue",async()=>{
 const {grant,list}=await import("./collaboration.ts");
 const {issueAgentCredential,authenticateAgent,revokeAgentCredentials}=await import("./agent-credentials.ts");
 const {requestHandoff}=await import("./collaboration-requests.ts");
 const p="credential-race-ci";
 await sql`insert into scotty_projects(id) values(${p})`;
 await grant(p,"chief-0");await grant(p,"agent-12");
 const issued=await issueAgentCredential("chief-0",p,5);
 const actor=await authenticateAgent(new Request("https://scotty.example",{headers:{authorization:"Bearer "+issued.credential}}),p);
 await revokeAgentCredentials("chief-0",p);
 await expect(requestHandoff(p,"chief-0","agent-12","Stale auth","Must not enqueue",undefined,true,actor.tokenHash)).rejects.toThrow("revoked or expired");
 const audit=JSON.stringify((await list(p)).audit);
 expect(audit).toContain("credential.issue");
 expect(audit).toContain("credential.revoke");
 expect(audit).not.toContain(issued.credential);
 expect(audit).not.toContain(actor.tokenHash);
});

test("audit failure rolls back a queued request and registry stays intact",async()=>{
 const {grant}=await import("./collaboration.ts");
 const {requestHandoff}=await import("./collaboration-requests.ts");
 const p="audit-rollback-ci";
 await sql`insert into scotty_projects(id) values(${p})`;
 await grant(p,"chief-0");await grant(p,"agent-12");
 await sql`create function ci_reject_audit() returns trigger language plpgsql as $$
 begin if NEW.project_id='audit-rollback-ci' then raise exception 'CI audit unavailable'; end if; return NEW; end $$`;
 await sql`create trigger ci_reject_audit before insert on scotty_collab_audit for each row execute function ci_reject_audit()`;
 try{
  await expect(requestHandoff(p,"chief-0","agent-12","Atomic","No audit means no request")).rejects.toThrow("CI audit unavailable");
  expect((await sql`select count(*)::int as n from scotty_collab_requests where project_id=${p}`)[0].n).toBe(0);
 }finally{
  await sql`drop trigger ci_reject_audit on scotty_collab_audit`;
  await sql`drop function ci_reject_audit()`;
 }
 expect(await sql`select id,name,department,sort_order from scotty_agents order by sort_order`).toEqual(registryBefore);
});

