// Read-only HTML review screen. All state changes use authenticated API calls.
// Never embed the admin token in this page.
export function renderReviewPage(){
 return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>S.C.O.T.T.Y. Learning Review</title><style>
 body{background:#101b1a;color:#f3eee2;font:16px system-ui;margin:0;padding:32px}main{max-width:780px;margin:auto}h1{color:#d8c28a}.card{border:1px solid #53615d;border-radius:12px;padding:18px;margin:12px 0;background:#182623}small{color:#b4c1bb}code{color:#e1ca9b}button{padding:10px;border-radius:8px;background:#d8c28a;color:#17221e;border:0;cursor:pointer}
 </style></head><body><main><h1>S.C.O.T.T.Y. — Learning Review</h1><p>Owner-only learning review. Sign in through the authenticated server session before viewing proposals.</p><section id="items">Loading proposals…</section><p id="message"></p></main>
 <script>
 async function load(){const out=document.getElementById('items');try{const res=await fetch('/api/agents/learning/review',{credentials:'same-origin'});if(!res.ok){out.textContent='Owner session required. The review API is not available to this browser.';return;}const data=await res.json();out.replaceChildren();for(const p of data.proposals){const card=document.createElement('article');card.className='card';const heading=document.createElement('h3');heading.textContent=p.agentId+' — '+p.status;const text=document.createElement('p');text.textContent=p.text;const meta=document.createElement('small');meta.textContent='Source: '+p.source+' | Scope: '+p.scope+' | Submitted: '+p.submittedAt;card.append(heading,text,meta);out.append(card);}if(!data.proposals.length)out.textContent='No learning proposals.';}catch{out.textContent='Could not load proposals.';}}
 load();
 </script></body></html>`,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'","X-Content-Type-Options":"nosniff"}});
}
