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
   const jobs=[['Render operations','/api/system/status'],['Cloudflare readiness','/api/independent-brain/readiness'],['Cloudflare status','/api/independent-brain/status'],['Cloudflare mission operations','/api/independent-brain/operations']];
   for(const [name,path] of jobs){
    const block=el('div');out.appendChild(block);
    try{const d=await api(path);line(block,name,'Connected');
     if(name==='Render operations'){
      line(block,'Overall state',d.status||d.health||'Reported by server');
      if(d.counts)for(const key of ['agents','chiefs','memory','missions','pendingApprovals'])if(d.counts[key]!=null)line(block,key,d.counts[key]);
     }else if(name==='Cloudflare mission operations'){
      line(block,'Dedicated memory ready',d.memoryReady);
      line(block,'Persisted mission count',d.total??'Not measured');
      for(const [state,count] of Object.entries(d.counts||{}))line(block,'  '+state,count);
      line(block,'Stale missions needing manual review',(d.staleRunningSample||[]).length);
      for(const m of d.staleRunningSample||[])line(block,'  Mission '+m.missionId,m.lastCheckpoint);
      line(block,'Provider quota',d.quota??'Unavailable — check Cloudflare dashboard');
      line(block,'Provider calls',d.providerCalls??'Unavailable — not measured');
      para(block,'These are stored checkpoint counts only. No inference, provider quota check or automatic retry occurred.');
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
     if(a||r.selectionReason)line(item,'Why selected',r.selectionReason||a?.selectionReason||a?.reason||'Department routing match');
     if(r.fieldKnowledge)line(item,'Knowledge guide',r.fieldKnowledge.title||r.fieldKnowledge.id||r.fieldKnowledge.version||'Field guide');
     if(r.specialistPlaybook){
      const book=r.specialistPlaybook;
      line(item,'Specialist playbook',book.focus+' · '+book.version);
      line(item,'Knowledge verification',book.reviewed===true?'Owner reviewed':'Authored methodology — not verified field facts');
      if(book.foundation)para(item,book.foundation);
      for(const step of (book.procedure||[]).slice(0,5))para(item,'Procedure: '+String(step).slice(0,280));
      if(book.workedExample)para(item,'Synthetic example: '+String(book.workedExample).slice(0,360));
      for(const boundary of (book.boundaries||[]).slice(0,3))para(item,'Limit: '+String(boundary).slice(0,240));
      for(const candidate of (book.candidateReferences||[]).slice(0,2)){
       line(item,'Research candidate',candidate.publisher+' (unverified; requires owner/source review)');
      }
     }
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
     for(const op of ['correct','review','move','supersede','forget']){
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
  const targetSpace=op==='move'?input(controls,'Move into existing memory space ID'):null;
  const reason=input(controls,'Reason for change (recorded in history)');
  const out=el('div');controls.appendChild(out);
  btn(controls,'Generate change preview',async()=>{clear(out);
   if(op==='correct'&&!text.value.trim()){para(out,'Provide correction text first.');return}
   if(op==='review'&&!/^\d{4}-\d{2}-\d{2}$/.test(text.value)){para(out,'Enter review date YYYY-MM-DD.');return}
   const changes=op==='correct'?{text:text.value}:op==='review'?{reviewAfter:text.value}:{};
   try{
    const p=await api('/api/knowledge/preview',{id:m.id,operation:op,changes,reviewAfter:op==='review'?text.value:undefined,scope:op==='move'?targetSpace.value.trim():undefined,reason:reason.value});
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
 function showBackupContinuity(parent){
  para(parent,'Verified as of October 30, 2026. These are dated review notes, not a live Render control-plane feed; recheck the provider before acting.');
  const expiry=new Date('2026-11-07T17:46:59.110Z').getTime();
  const now=Date.now();
  line(parent,'Free PostgreSQL expiry','November 7, 2026, 17:46 UTC (09:46 Pacific standard time)');
  line(parent,'Time until recorded deadline',now<expiry?Math.ceil((expiry-now)/86400000)+' calendar-day equivalent(s)':'Recorded date has passed; verify status directly with Render');
  line(parent,'Last verified full PostgreSQL restore','October 18, 2026 — 77 tables / 6 sequences / 128 agents / 12 chiefs');
  line(parent,'October 24 backup attempts','Failed — DATABASE_URL missing from existing backup cron');
  para(parent,'The October 18 encrypted production snapshot was independently restored. Any later changes need a more recent verified recovery point.');
  const links=[
    ['Render PostgreSQL database','https://dashboard.render.com/d/dpg-db3te4rbc2fs73bt4p50-a'],
    ['Existing encrypted backup cron','https://dashboard.render.com/cron/crn-dba53f61egvs739d4ivg'],
    ['Recovery and deadline checklist','https://github.com/LyzabetCampbella2/scotty-core/issues/55']
  ];
  for(const [label,url] of links){
   const a=el('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';css(a,'display:block;margin:5px;color:#a9eafa');parent.appendChild(a);
  }
  para(parent,'Never paste a DATABASE_URL or recovery key here. Configure the internal connection URL in Render private environment settings only. Do not enable exports, change billing, or migrate without an explicitly approved recovery plan.');
 }
 function showDepartmentAcceptance(parent){
  para(parent,'One tailored fictional assignment per department. Viewing does not contact a model or save memory; each real answer still requires an owner review before PASS.');
  const out=el('div');parent.appendChild(out);
  btn(parent,'Load 25 practical department acceptance cases (read-only)',async()=>{
   clear(out);
   try{
    const d=await api('/api/independent-brain/quality-cases');
    line(out,'Authored test version',d.version||'Not reported');
    line(out,'Department cases',(d.cases||[]).length);
    line(out,'Model calls',d.modelCalls??0);
    for(const c of d.cases||[]){
     const item=el('details');css(item,'padding:8px;margin:6px 0;border:1px solid #456070;border-radius:8px');out.appendChild(item);
     const heading=el('summary',c.department+' — '+(c.synthetic?'Synthetic':'Unknown evidence'));item.appendChild(heading);
     line(item,'Assigned specialist',c.specialistId);
     line(item,'Reviewing chief',c.chiefId);
     para(item,c.question);
     for(const criterion of c.reviewCriteria||[])para(item,'Review: '+criterion);
     line(item,'Status',c.ownerReviewRequired?'Not run / owner review required':'Unverified');
    }
    para(out,d.warning||'Do not interpret the test fixture as verified agent competence.');
   }catch(e){error(out,e)}
  });
  btn(parent,'Open existing Brain Lab to run owner-reviewed acceptance',()=>{root.location.href='/brain-lab'});
 }
 function projectCommandCenter(parent){
  para(parent,'This reads existing owner-authorized Render projects and mission status. No documents or private notes are sent to Cloudflare; actions still require their original per-operation approvals.');
  const status=el('div');parent.appendChild(status);
  const picker=el('select');picker.setAttribute('aria-label','Choose a real SCOTTY project');css(picker,'display:block;width:100%;padding:9px');parent.appendChild(picker);
  const result=el('div');parent.appendChild(result);
  const link=(where,label,url)=>{
   const a=el('a',label);a.href=url;a.target='_self';a.rel='noopener noreferrer';
   css(a,'display:block;padding:5px;color:#a9eafa');where.appendChild(a);
  };
  async function loadProjects(){
   clear(status);clear(picker);clear(result);
   try{
    const d=await api('/api/agent-brains/project-operations');
    line(status,'Existing projects',(d.projects||[]).length);
    line(status,'Live draft calls enabled',d.realDraftsEnabled===true);
    line(status,'Provider configured',d.providerConfigured===true?'Yes':'No or unavailable');
    line(status,'Ansjem collaboration enabled',d.ansjemEnabled===true);
    for(const p of d.projects||[]){
     const opt=el('option',String(p.name||p.id));opt.value=p.id;picker.appendChild(opt);
    }
    if(!(d.projects||[]).length)para(status,'No permitted projects returned. Open the native project workspace to create or authorize one.');
   }catch(e){error(status,e);para(status,'Project operations might be disabled by an owner feature flag. No changes were made.');}
  }
  btn(parent,'Load my real project list',loadProjects);
  btn(parent,'Inspect selected project team, missions and briefing',async()=>{
   clear(result);const id=picker.value;
   if(!/^[A-Za-z0-9_-]{1,160}$/.test(id)){para(result,'Select a valid existing project first.');return}
   const base='/api/agent-brains/project-operations/'+encodeURIComponent(id);
   for(const [title,slug] of [['Daily chief-of-staff briefing','brief'],['Mission stages and blockers','progress'],['Selected project team','team-status'],['Approved document/evidence register','evidence']]){
    const item=el('div');css(item,'padding:7px;border-bottom:1px solid #456070');result.appendChild(item);
    try{
     const d=await api(base+'/'+slug);
     line(item,title,'Available — current owner-authenticated response');
     if(slug==='brief'){
      const b=d.brief||{};
      line(item,'As of',b.asOf||'Unknown');
      for(const [key,name] of [['overdue','Overdue tasks'],['upcoming','Upcoming deadlines'],['decisions','Owner decisions'],['blocked','Blockers']])line(item,name,(b[key]||[]).length);
      line(item,'Pending handoffs',b.pendingHandoffs??'Not reported');
      for(const t of (b.upcoming||[]).slice(0,7))line(item,'Upcoming',t.title+' · '+(t.dueAt||'Date unavailable'));
      for(const x of (b.decisions||[]).slice(0,7))line(item,'Decision',x.goal+' · '+x.status);
      for(const gap of (b.gaps||[]).slice(0,6))para(item,'Source gap: '+gap);
      para(item,'Saved connected-app snapshots are not equivalent to fresh Calendar, Gmail or Drive access.');
     }
     if(slug==='progress')for(const m of (d.missions||[]).slice(0,15)){
      line(item,'Mission',m.goal+' · '+m.status);
      line(item,'Stages',(m.steps||[]).length);
      if(m.blocker)line(item,'Blocked',m.blocker);
      for(const step of (m.steps||[]).slice(0,10))line(item,'  '+step.agentId,step.status+' · '+step.deliverable);
     }
     if(slug==='team-status')line(item,'Current members',(d.members||[]).map(x=>x.name||x.id).slice(0,20).join(', ')||'None reported');
     if(slug==='evidence'){
      const items=d.evidence||[];
      line(item,'Owner-approved sources',items.filter(x=>!x.revoked_at).length);
      for(const x of items.slice(0,12))line(item,'  '+x.title,x.revoked_at?'Revoked':'Approved recipient IDs: '+(x.recipients||[]).length);
     }
    }catch(e){line(item,title,'Unavailable or disabled');error(item,e)}
   }
  });
  link(parent,'Open full Project Operations (teams, documents, deadlines, decisions)','/agents/project-operations');
  link(parent,'Open multi-step Mission Editor','/agents/project-missions');
  link(parent,'Open approval-controlled cross-team inbox','/agents/collaboration-inbox');
  link(parent,'Open voice-driven folder workspace','/workspace');
  para(parent,'Voice commands already available when enabled: “Scotty, list my projects”, “Read my daily briefing”, “Read mission progress”, “Build a project team”, “List my Google Docs”, and “List my Notion pages”. Physical microphone recognition is still unverified.');
 }
 function projectTeamPresets(parent,projectId){
  const area=el('div');css(area,'padding:8px;border:1px solid #456070;border-radius:8px');parent.appendChild(area);
  para(area,'Project team presets are owner-reviewed templates only. They do not start AI, share evidence, create agents, or grant project membership.');
  async function load(){
   clear(area);para(area,'Stored teams are checked against current project grants. Revoked agents disable reuse.');
   try{
    const base='/api/agent-brains/project-operations/'+encodeURIComponent(projectId);
    const [members,templates]=await Promise.all([api(base+'/team-status'),api(base+'/team-presets')]);
    const people=members.members||[],current=templates.teams||[];
    line(area,'Project members available',people.length);
    for(const t of current){
     const tile=el('div');css(tile,'padding:7px;border-bottom:1px solid #456070');area.appendChild(tile);
     line(tile,'Preferred team '+t.name,'revision '+t.revision);
     line(tile,'Members',t.agentIds.join(', '));
     line(tile,'Lead chief',t.leadChiefId);
     line(tile,'Current access',t.active?'Current permitted members':'STALE — member removed or paused; do not reuse');
    }
    const name=input(area,'Team name (example: Manuscript Review Team)');
    const selectChief=el('select');selectChief.setAttribute('aria-label','Lead project chief');area.appendChild(selectChief);
    for(const p of people.filter(x=>x.isChief===true)){const op=el('option',p.name||p.id);op.value=p.id;selectChief.appendChild(op)}
    const selections=el('div');area.appendChild(selections);
    const boxes=[];
    for(const p of people){
     const choice=check(selections,(p.name||p.id)+(p.isChief?' · chief':' · specialist'));boxes.push({id:p.id,checked:choice});
    }
    const approval=check(area,'I reviewed the exact team and confirm the selected agents already have permission for this project.');
    const preview=el('div');area.appendChild(preview);
    btn(area,'Review preferred team (no write)',()=>{
     clear(preview);
     line(preview,'Team',name.value.trim());
     line(preview,'Selected existing members',boxes.filter(x=>x.checked.checked).map(x=>x.id).join(', ')||'None');
     line(preview,'Lead chief',selectChief.value);
     para(preview,'No source sharing, external action, model call or permission grant will occur. A subsequent save requires approval.');
    });
    btn(area,'Save owner-reviewed team preset',async()=>{
     const chosen=boxes.filter(x=>x.checked.checked).map(x=>x.id),teamName=name.value.trim();
     const existing=current.find(x=>x.name.toLowerCase()===teamName.toLowerCase());
     if(!approval.checked){para(preview,'Not saved — review and approve the exact team first.');return}
     if(chosen.length<2||chosen.length>8||!selectChief.value||!teamName){para(preview,'Choose a team name, lead chief and 2–8 approved project members.');return}
     const body={action:'save',name:teamName,agentIds:chosen,leadChiefId:selectChief.value,
      expectedRevision:existing?.revision||0,reviewed:true,approved:true};
     try{
      const response=await fetch(base+'/team-presets',{method:'POST',credentials:'same-origin',cache:'no-store',
       headers:{'content-type':'application/json','x-scotty-csrf':'1'},body:JSON.stringify(body)});
      const data=await response.json();
      if(!response.ok||data.ok===false)throw Error(data.error||'Save rejected');
      clear(preview);line(preview,'Saved team ID',data.id);line(preview,'Revision',data.revision);
      para(preview,'Team template stored. No model run or project permission grant occurred. Reload to independently verify.');
      approval.checked=false;
     }catch(e){error(preview,e)}
    });
   }catch(e){error(area,e)}
  }
  btn(area,'Reload preferred project teams',load);
  load();
 }
 function showConnectedActions(parent){
  para(parent,'Verify connections before asking SCOTTY to act. Viewing status performs no sends, calendar edits, Drive uploads or Notion writes. Actual changes require the existing connector action preview and owner confirmation.');
  const out=el('div');parent.appendChild(out);
  btn(parent,'Check connector configuration (read-only)',async()=>{
   clear(out);
   try{
    const d=await api('/api/connectors');
    const desired=['notion','googledocs','google','gmail','googlecalendar','googledrive','appleplanner'];
    const entries=Array.isArray(d.providers)?d.providers:Object.entries(d.providers||{}).map(([provider,data])=>({provider,...(data||{})}));
    for(const name of desired){
     const x=entries.find(v=>v.provider===name||v.name===name||v.id===name);
     line(out,name,x?String(x.status||x.state||(x.enabled?'Configured':'Listed; check account')||'Unverified'):'Not listed — do not assume connected');
    }
    if(d.vaultConfigured===false)para(out,'Connector vault is not configured; do not attempt external actions.');
    para(out,'A listed connector is not proof that the account is reachable, a token is valid, or a requested operation is permitted. Verify in the full Connectors screen.');
   }catch(e){error(out,e);para(out,'Cannot verify connected apps from this environment. Avoid making provider actions.')}
  });
  btn(parent,'Check original folder and document database (read-only)',async()=>{
   const box=el('div');parent.appendChild(box);
   try{
    const d=await api('/api/folders?structure=1');
    line(box,'Available folders',(d.folders||[]).length);
    line(box,'Available projects',(d.projects||[]).length);
    para(box,'These are same-origin records; no changes or sharing have occurred.');
   }catch(e){error(box,e)}
  });
  const links=[
   ['Open existing app Connectors','/connectors'],
   ['Review Google Docs and Notion evidence permissions','/agents/project-operations'],
   ['Open native folders and files','/workspace'],
   ['Open approved ANSJEM / Dawna work exchange','/agents/project-operations']
  ];
  for(const [label,url] of links){const a=el('a',label);a.href=url;a.target='_self';css(a,'display:block;margin:5px;color:#a9eafa');parent.appendChild(a);}
  para(parent,'SCOTTY–Dawna: this is the existing Ansjem work-request and handoff workflow, not an automatically established live API connection. Both systems retain independent ownership; sharing and releases remain owner-approved.');
  para(parent,'Deliverables: use the project mission editor and existing file workspace to review reports, outlines, schedules and content plans. A draft is not a downloadable PDF, DOCX or completed external action until its output is generated and verified.');
 }
 function showCloudflareMemory(parent){
  para(parent,'Dedicated Cloudflare D1 memory is separate from Render PostgreSQL. This section reads only the chosen agent’s notes; changes require a new preview and explicit owner approval. Governance migration v2 must first be applied to the dedicated D1 database.');
  const agent=input(parent,'Exact Cloudflare specialist or chief ID','scotty');
  const out=el('div');parent.appendChild(out);
  btn(parent,'Inspect conflicting D1 notes (read-only)',async()=>{
   const id=agent.value.trim(),box=el('div');parent.appendChild(box);
   if(!/^[a-zA-Z0-9-]{1,90}$/.test(id)){para(box,'Choose an exact agent ID.');return}
   try{
    const data=await api('/api/independent-brain/memory-conflicts?agentId='+encodeURIComponent(id));
    line(box,'Active notes compared',data.searched);
    line(box,'Conflicts requiring owner review',(data.conflicts||[]).length);
    for(const issue of data.conflicts||[])line(box,'Conflict '+issue.key,'Notes '+issue.ids.join(', ')+'. '+issue.reason);
    para(box,data.warning||'No automatic conflict resolution.');
   }catch(e){error(box,e)}
  });
  btn(parent,'Read reviewed D1 notes',async()=>{
   clear(out);
   const id=agent.value.trim();
   if(!/^[a-zA-Z0-9-]{1,90}$/.test(id)){para(out,'Choose a valid exact agent ID.');return}
   try{
    const readiness=await api('/api/independent-brain/status');
    const ready=readiness.governanceMigrationReady===true;
    line(out,'D1 governance migration',ready?'Verified ready by Worker':'Unavailable — edits disabled');
    const data=await api('/api/independent-brain/memory?agentId='+encodeURIComponent(id));
    for(const n of data.notes||[]){
     const item=el('div');css(item,'padding:10px;margin:10px 0;border:1px solid #456070;border-radius:6px');out.appendChild(item);
     line(item,'D1 note '+n.id,n.title);
     para(item,String(n.content||'').slice(0,1800));
     line(item,'Scope',n.scope);line(item,'Reviewed',n.reviewedAt);line(item,'Expires',n.expiresAt);
     if(n.url){const a=el('a','Read original source');a.href=n.url;a.target='_blank';a.rel='noopener noreferrer';item.appendChild(a)}
     if(!ready){para(item,'Read-only: the isolated D1 governance schema has not been verified. No changes or history requests are enabled.');continue;}
     btn(item,'Read redacted change history',async()=>{const box=el('div');item.appendChild(box);
      try{const h=await api('/api/independent-brain/memory-history?noteId='+encodeURIComponent(n.id));
       for(const c of h.changes||[])line(box,c.action,c.changedAt);
       if(!(h.changes||[]).length)para(box,'No changes recorded in the D1 governance audit.');
      }catch(e){error(box,e)}
     });
     for(const op of ['correct','replace','expire','archive','delete'])btn(item,op,()=>cloudflareChange(item,n,op));
    }
    if(!(data.notes||[]).length)para(out,'No unexpired notes returned for this agent.');
   }catch(e){error(out,e)}
  });
 }
 function cloudflareChange(parent,n,action){
  const area=el('div');css(area,'padding:9px;margin:9px 0;border:1px solid #84b7bc;border-radius:8px');parent.appendChild(area);
  headline(area,action+' D1 note '+n.id);
  const title=['correct','replace'].includes(action)?input(area,'New reviewed title',n.title):null;
  const content=['correct','replace'].includes(action)?input(area,'New reviewed content',n.content):null;
  const expires=action==='expire'?input(area,'Future expiration date, YYYY-MM-DD'):null;
  const privacy=check(area,'I confirm this note and any edits contain no private, client, account or production data.');
  const summary=el('div');area.appendChild(summary);
  btn(area,'Preview exact D1 change — no mutation',async()=>{
   clear(summary);if(!privacy.checked){para(summary,'No request sent. Confirm the privacy statement first.');return}
   const payload={stage:'preview',noteId:n.id,action,noPrivateDataConfirmed:true};
   if(title){payload.title=title.value;payload.content=content.value;}
   if(expires){payload.expiresAt=expires.value+'T00:00:00.000Z';}
   try{
    const p=await api('/api/independent-brain/memory-change',payload);
    para(summary,p.reminder||'Review the before and after values.');
    line(summary,'Old content',String(p.old?.content||'').slice(0,600));
    line(summary,'Next content',p.next?.deleted?'Deleted':String(p.next?.content||'').slice(0,600));
    line(summary,'Old expiry',p.old?.expiresAt);
    line(summary,'New expiry',p.next?.deleted?'Deleted':p.next?.expiresAt);
    const agree=check(summary,'I reviewed the exact preview and authorize this one D1 operation.');
    btn(summary,'Confirm and apply reviewed D1 change',async()=>{
     if(!agree.checked){para(summary,'Not applied. Confirm this preview first.');return}
     try{
      const applied=await api('/api/independent-brain/memory-change',{...payload,stage:'apply',previewToken:p.previewToken,approved:true,reviewAcknowledged:true});
      para(summary,applied.verified?'Change independently read back and verified. Refresh notes.':'The change could not be verified; check the D1 database before retrying.');
     }catch(e){error(summary,e)}
    });
   }catch(e){error(summary,e)}
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
        line(info,'Publication date',item.publishedAt||'Not provided — review source');
        line(info,'Publisher',item.publisher||found.publisher||'Not reported');
        const proposal=item.proposedKnowledgeUpdate;
        if(proposal){
         line(info,'Update state',proposal.status||'Pending owner review');
         line(info,'Target fields',(proposal.targetDepartments||[]).join(', ')||'Not assigned');
         para(info,proposal.proposedAction||'Read the original publication and verify each claim before approving a knowledge note.');
         line(info,'Verified claims',Array.isArray(proposal.verifiedClaims)?proposal.verifiedClaims.length:'Not verified');
        }
        line(info,'Trust','Unverified candidate; no automatic publishing or memory update');
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
  section(panel,'Cloudflare · Reviewed D1 notes and governance',showCloudflareMemory);
  section(panel,'Recovery · verified backup and November 7 continuity',showBackupContinuity);
  section(panel,'4 · Mission checkpoints and recovery evidence',showMissions);
  section(panel,'5 · Publisher source candidates',showSources);
  section(panel,'6 · Department-specific acceptance cases',showDepartmentAcceptance);
  section(panel,'7 · Project Command Center — approved teams, evidence, missions and briefings',projectCommandCenter);
  section(panel,'8 · Connected apps, document workspace and Dawna exchange',showConnectedActions);
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
