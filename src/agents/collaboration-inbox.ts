// Owner-only approval inbox. Hosted by the Render owner-session bridge.
export function renderCollaborationInbox(){
 return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>S.C.O.T.T.Y. — Collaboration Inbox</title><style>
 body{margin:0;padding:28px;background:#111d1b;color:#f1f0e8;font:16px system-ui}main{max-width:850px;margin:auto}
 article{background:#1b2925;border:1px solid #5d6d64;border-radius:12px;padding:18px;margin:12px 0}
 small{color:#bdc7c0}h1{color:#dfc78d}button{border:0;border-radius:8px;background:#d9c58e;color:#17231f;padding:10px 14px;margin:10px 8px 0 0;cursor:pointer}
 button:disabled{opacity:.5}
 </style></head><body><main><h1>Collaboration approval inbox</h1><p>Project handoffs are held until you approve them. Review sources and recipients before granting access.</p><button id="refresh" type="button">Refresh approval queue</button><p id="count" aria-live="polite"></p><section id="requests">Loading…</section><p id="notice" role="status"></p></main><script>
 const root=document.getElementById("requests"),notice=document.getElementById("notice"),counter=document.getElementById("count");
 document.getElementById("refresh").addEventListener("click",()=>load());
 async function load(){try{const r=await fetch("/api/agent-brains/collaboration-requests",{credentials:"same-origin"});if(!r.ok)throw Error("Owner session required");const data=await r.json();root.replaceChildren();counter.textContent=data.requests.length+" pending request(s) requiring review";for(const p of data.requests){
 const article=document.createElement("article"),h=document.createElement("h3"),summary=document.createElement("p"),details=document.createElement("small");
 h.textContent=p.title;summary.textContent=p.summary;
 details.textContent="Project: "+p.project_id+" | From: "+p.source_agent_id+" | To: "+p.recipient_agent_id+" | "+p.kind;
 article.append(h,summary,details);for(const decision of ["approved","rejected"]){const b=document.createElement("button");b.textContent=decision==="approved"?"Approve":"Reject";b.addEventListener("click",async()=>{if(!confirm("Confirm "+decision+" for this project handoff?"))return;b.disabled=true;try{const result=await fetch("/api/agent-brains/collaboration-requests/"+encodeURIComponent(p.id),{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-Scotty-CSRF":"1"},body:JSON.stringify({decision})});if(!result.ok)throw Error("Action failed");notice.textContent="Request "+decision;await load();}catch(e){notice.textContent="Unable to review request; please retry.";b.disabled=false}});article.append(b)}root.append(article)}if(!data.requests.length)root.textContent="No pending handoffs.";}catch(e){root.textContent="Owner login or approval queue unavailable."}}
 load();
 </script></body></html>`,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}
