/* SCOTTY main HUD: owner-only Brain Operations window.
 * Read-only by default. Every memory mutation requires preview and a separate confirmation.
 * No Cloudflare request containing user-written text is sent before explicit owner opt-in.
 */
(function(root){
 'use strict';
 if(root.SCOTTYBrainOperations)return;
 const el=(tag,txt)=>{const n=document.createElement(tag);if(txt!=null)n.textContent=String(txt);return n};
 const css=(n,s)=>{n.style.cssText=s;return n};
 const btn=(parent,label,fn)=>{const b=el('button',label);b.type='button';css(b,'padding:8px 11px;border:1px solid #75b9cb;border-radius:8px;background:#142e46;color:#f0ffff;margin:4px;cursor:pointer');b.addEventListener('click',fn);parent.appendChild(b);return b};
 const para=(parent,txt)=>{const p=el('p',txt);parent.appendChild(p);return p};
 const headline=(parent,s)=>{const h=el('h3',s);css(h,'margin:14px 0 6px;font-size:17px');parent.appendChild(h);return h};
 const input=(parent,placeholder,value='')=>{const n=el('input');n.placeholder=placeholder;n.value=value;css(n,'display:block;box-sizing:border-box;width:100%;padding:9px;background:#fff;color:#111;border:1px solid #b7ccd1;border-radius:6px;margin:5px 0');parent.appendChild(n);return n};
 const check=(parent,text)=>{const lab=el('label');css(lab,'display:block;margin:10px 0');const n=el('input');n.type='checkbox';lab.appendChild(n);lab.appendChild(document.createTextNode(' '+text));parent.appendChild(lab);return n};
 const clear=n=>{while(n.firstChild)n.firstChild.remove()};
 async function api(path,data){
  const r=await fetch(path,{credentials:'same-origin',cache:'no-store',method:data?'POST':'GET',headers:data?{'content-type':'application/json'}:{},...(data?{body:JSON.stringify(data)}:{})});
  let d;try{d=await r.json()}catch{throw Error('Invalid server response for '+path)}
  if(!r.ok||d.ok===false)throw Error(String(d.message||d.error||'Request failed')+' (HTTP '+r.status+')');
  return d;
 }
 let panel;
 function line(parent,name,value){const row=el('p');const strong=el('strong',name+': ');row.appendChild(strong);row.appendChild(document.createTextNode(String(value??'Not reported')));parent.appendChild(row)}
 function error(parent,e){para(parent,'Unavailable: '+String(e.message||e).slice(0,240))}
 function section(parent,name,fn){const wrap=el('section');css(wrap,'padding:12px;margin:10px 0;border:1px solid #456070;border-radius:9px');headline(wrap,name);parent.appendChild(wrap);fn(wrap);return wrap}
 async function showReadiness(parent){
  const out=el('div');parent.appendChild(out);
  async function refresh(){clear(out);
   const jobs=[['Render operations','/api/system/status'],['Cloudflare readiness','/api/independent-brain/readiness'],['Cloudflare status','/api/independent-brain/status']];
   for(const [name,path] of jobs){
    const block=el('div');out.appendChild(block);
    try{const d=await api(path);line(block,name,'Connected');
     if(name==='Render operations'){
      line(block,'Overall state',d.status||d.health||'Reported by server');
      if(d.counts)for(const key of ['agents','chiefs','memory','missions','pendingApprovals'])if(d.counts[key]!=null)line(block,key,d.counts[key]);
     }else{
      for(const key of ['release','memoryConnected','memoryBound','liveRosterVerified','aiEnabled','teamMaxCalls','memoryReason','ready'])if(d[key]!==undefined)line(block,key,d[key]);
      line(block,'Remaining provider quota',d.quota??'Unavailable — not measured');
     }
    }catch(e){line(block,name,'Not verified');error(block,e)}
   }
   para(out,'Live D1 read/write, PostgreSQL scope isolation and iPad audio acceptance require separate owner-authenticated testing. A green status alone is not proof.');
  }
  btn(parent,'Refresh readiness (read-only)',refresh);refresh();
 }
 function showPreview(parent){
  para(parent,'Inspect the proposed specialist → chief → SCOTTY readers and the scoped material they may use. The preview calls Cloudflare but does not run AI or write memory.');
  const task=input(parent,'Synthetic assignment (no private or client information)');
  const size=el('select');for(const value of [1,2]){const o=el('option',value+' department'+(value===2?'s':''));o.value=String(value);size.appendChild(o)}parent.appendChild(size);
  const consent=check(parent,'I approve sending this non-private preview question to Cloudflare.');
  const out=el('div');parent.appendChild(out);
  btn(parent,'Preview selected agents and knowledge',async()=>{clear(out);
   if(!consent.checked){para(out,'Preview not sent. Review and approve the data-sharing checkbox.');return}
   const question=task.value.trim();if(!question||question.length>500){para(out,'Enter 1–500 characters.');return}
   try{
    const p=await api('/api/independent-brain/team-preview',{question,teamSize:Number(size.value)});
    para(out,p.warning||'Proposed readers; actual evidence may change before execution.');
    const assignments=p.plan?.assignments||[];
    for(const r of p.readers||[]){
     const item=el('div');css(item,'padding:8px;margin:6px 0;border-left:3px solid #84d5df');out.appendChild(item);
     line(item,r.name||r.agentId,r.role||'reader');
     const a=assignments.find(a=>a.agentId===r.agentId||a.chiefId===r.agentId);
     if(a)line(item,'Why selected',a.selectionReason||a.reason||a.specialty||'Department routing match');
     if(r.fieldKnowledge)line(item,'Knowledge guide',r.fieldKnowledge.title||r.fieldKnowledge.id||r.fieldKnowledge.version||'Field guide');
     const refs=r.references||[];
     line(item,'Scoped notes visible to this reader',refs.length);
     for(const note of refs.slice(0,12))line(item,'  '+(note.scope||'note')+' — '+(note.title||note.id),String(note.text||'').slice(0,140));
    }
    if(!(p.readers||[]).length)para(out,'No matching readers. Add the field and deliverable to your request.');
    line(out,'Model calls',p.providerCalls??0);line(out,'Memory writes',p.memoryWrites??0);
   }catch(e){error(out,e)}
  });
 }
 function showMemory(parent){
  para(parent,'Read current Render memories, inspect their sources and revisions, then request an explicit preview before changing or forgetting anything.');
  const space=input(parent,'Memory space','personal');
  const query=input(parent,'Search older and current notes');
  const out=el('div');parent.appendChild(out);
  btn(parent,'Search memories (read-only)',async()=>{
   clear(out);try{
    const d=await api('/api/knowledge?space='+encodeURIComponent(space.value.trim())+'&q='+encodeURIComponent(query.value.trim()));
    line(out,'Entries returned',d.memories?.length||0);line(out,'Conflicts/reviews due',d.conflicts?.length||0);
    for(const m of (d.memories||[]).slice(0,40)){
     const div=el('div');css(div,'padding:8px;margin:8px 0;border:1px solid #456070;border-radius:6px');out.appendChild(div);
     line(div,'Memory '+m.id,'revision '+m.revision+' • '+(m.kind||'note'));
     para(div,String(m.text||'').slice(0,500));
     line(div,'Source',m.sourceTitle||'Unlabeled');line(div,'Evidence',m.evidenceState||'Unverified');
     if(m.reviewAfter)line(div,'Review due',m.reviewAfter);
     const actions=el('div');div.appendChild(actions);
     for(const op of ['correct','review','supersede','forget']){
      btn(actions,op,()=>memoryChange(div,m,op));
     }
    }
   }catch(e){error(out,e)}
  });
 }
 function memoryChange(parent,m,op){
  const controls=el('div');css(controls,'padding:8px;border:1px solid #9fb9c8');parent.appendChild(controls);
  headline(controls,'Preview '+op+' — '+m.id);
  const text=op==='correct'?input(controls,'Replacement memory wording',m.text):op==='review'?input(controls,'Next review date (YYYY-MM-DD)'):null;
  const reason=input(controls,'Reason for change (recorded in history)');
  const out=el('div');controls.appendChild(out);
  btn(controls,'Generate change preview',async()=>{clear(out);
   if(op==='correct'&&!text.value.trim()){para(out,'Provide correction text first.');return}
   if(op==='review'&&!/^\d{4}-\d{2}-\d{2}$/.test(text.value)){para(out,'Enter review date YYYY-MM-DD.');return}
   const changes=op==='correct'?{text:text.value}:op==='review'?{reviewAfter:text.value}:{};
   try{
    const p=await api('/api/knowledge/preview',{id:m.id,operation:op,changes,reason:reason.value});
    para(out,p.notice||'Review the effect carefully.');
    line(out,'Operation',p.operation);line(out,'Current revision',p.before?.revision);
    line(out,'Expected next state',p.after?.status||'active');
    if(p.after?.text)line(out,'Text after change',String(p.after.text).slice(0,600));
    const acknowledge=check(out,'I reviewed this exact preview and authorize this one change.');
    btn(out,'Confirm and apply this preview',async()=>{
     if(!acknowledge.checked){para(out,'Not applied — approval checkbox is required.');return}
     try{const res=await api('/api/knowledge/apply',{id:p.id});para(out,'Applied to memory '+res.memoryId+' at revision '+res.revision+'. Refresh search to independently read it.');}catch(e){error(out,e)}
    });
   }catch(e){error(out,e)}
  });
 }
 function showMissions(parent){
  const out=el('div');parent.appendChild(out);
  btn(parent,'Inspect saved Cloudflare missions',async()=>{clear(out);try{
   const d=await api('/api/independent-brain/missions');
   for(const m of (d.missions||[]).slice(0,30)){
    const row=el('div');css(row,'padding:6px;border-bottom:1px solid #456070');out.appendChild(row);
    line(row,'Mission '+m.id,m.status);
    if(m.error)line(row,'Blocker',m.error);
    if(m.result?.answer)para(row,String(m.result.answer).slice(0,200));
    if(m.result?.answer){
     btn(row,'Review deliverable quality',async()=>{
      const note=el('div');row.appendChild(note);
      try{
       const d=await api('/api/hud/brain-upgrades/review',{
        question:String(m.result.question||m.question||m.task||'').slice(0,500),
        answer:String(m.result.answer).slice(0,16000),
        results:Array.isArray(m.result.results)?m.result.results.slice(0,12):[],
        references:Array.isArray(m.result.references)?m.result.references.slice(0,30):[]
       });
       line(note,'Review verdict',d.review.verdict);
       for(const issue of d.review.flags||[])para(note,'Needs checking: '+issue);
       para(note,d.review.warning);
      }catch(e){error(note,e)}
     });
    }
   }
   if(!(d.missions||[]).length)para(out,'No stored mission checkpoints returned. This is not proof of durable writes.');
  }catch(e){error(out,e)}});
 }
 function showSources(parent){
  para(parent,'Publisher headlines are candidate references only: no fact verification, automatic publishing, or memory promotion.');
  const out=el('div');parent.appendChild(out);
  btn(parent,'Read curated publisher list',async()=>{clear(out);
   try{const d=await api('/api/independent-brain/sources');
    for(const feed of d.feeds||[]){
     const div=el('div');css(div,'padding:7px;border-bottom:1px solid #456070');out.appendChild(div);
     line(div,'Publisher',feed.publisher);line(div,'Feed',feed.url);
     btn(div,'Discover headlines (no save)',async()=>{
      const info=el('div');div.appendChild(info);try{
       const found=await api('/api/independent-brain/discover',{feedId:feed.id});
       line(info,'Fetched at',found.fetchedAt||'Not reported');
       for(const item of found.items||[]){
        const a=el('a',item.title);a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.style.display='block';info.appendChild(a);
        line(info,'Publication date',item.publishedAt||'Not provided — review source');line(info,'Trust','Unverified candidate; no update applied');
       }
      }catch(e){error(info,e)}
     });
    }
   }catch(e){error(out,e)}
  });
 }
 function open(){
  if(panel){panel.focus();return}
  panel=el('aside');panel.tabIndex=-1;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','SCOTTY Brain Operations');
  css(panel,'position:fixed;z-index:1000010;inset:5vh 3vw auto;max-width:700px;max-height:90vh;overflow:auto;margin:auto;padding:18px;background:#0b1b2c;color:#e8f7fa;border:2px solid #73cbd9;border-radius:12px;box-shadow:0 18px 65px #000d;font:14px/1.5 system-ui,sans-serif');
  document.body.appendChild(panel);headline(panel,'SCOTTY · Brain Operations');
  para(panel,'Owner controls in the original HUD. All requests are authenticated. Nothing shown here certifies live microphone, provider quota, or database scope tests.');
  btn(panel,'Close',()=>{panel.remove();panel=null});
  section(panel,'1 · Readiness, status and quota',showReadiness);
  section(panel,'2 · Agent selection and knowledge preview',showPreview);
  section(panel,'3 · Memory search, source review and change approval',showMemory);
  section(panel,'4 · Mission checkpoints and recovery evidence',showMissions);
  section(panel,'5 · Publisher source candidates',showSources);
  btn(panel,'Open existing System & Recovery',()=>{root.location.href='/system'});
  panel.focus();
 }
 function init(){
  if(document.getElementById('scotty-brain-operations-launch'))return;
  const button=el('button','Brain Operations');
  button.id='scotty-brain-operations-launch';button.type='button';
  css(button,'position:fixed;z-index:100000;left:12px;bottom:14px;border:1px solid #79c6cc;border-radius:24px;padding:9px 15px;background:#0b1b2c;color:#efffff;box-shadow:0 4px 14px #0009;font:13px system-ui');
  button.addEventListener('click',open);document.body.appendChild(button);
 }
 root.SCOTTYBrainOperations={open};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(window);
