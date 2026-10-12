(function(){
 if(window.SCOTTYConversation)return;
 const core=window.SCOTTYConversationCore,db=core.store(localStorage),$=q=>document.querySelector(q);
 let prefs;try{prefs=core.preferences(JSON.parse(localStorage.getItem(core.prefsKey)||'{}'))}catch{prefs=core.preferences()}
 let run=0,request=null,busy=false,draft='',spokenText='',speechRun=0,convoUntil=0;
 const style=document.createElement('style');style.textContent=`
 #conversationPanel{display:none;position:absolute;left:10px;top:94px;bottom:70px;z-index:1300;width:min(420px,calc(100% - 20px));box-sizing:border-box;overflow:auto;padding:14px;border:1px solid #28616a;border-radius:10px;background:rgba(2,12,21,.98);color:#d8edf6;font-size:12px;touch-action:pan-y}#conversationPanel.open{display:block}#conversationPanel label{display:block;margin:10px 0 5px;color:#9abcc8}#conversationPanel input,#conversationPanel select,#conversationPanel textarea{box-sizing:border-box;width:100%;padding:9px;border:1px solid #28616a;border-radius:6px;background:#071827;color:white;font-size:16px}#conversationPanel button,#conversationCaptions button{padding:8px;border:1px solid #28616a;border-radius:6px;background:#12313b;color:white}#conversationPanel .ca{display:flex;gap:6px;margin:8px 0;flex-wrap:wrap}#conversationTranscript{max-height:230px;overflow:auto}#conversationTranscript p{white-space:pre-wrap;line-height:1.45;border-bottom:1px solid #173640;padding-bottom:8px}#conversationPanel small{color:#92adb8}#conversationCaptions{position:absolute;left:10px;bottom:40px;width:min(520px,calc(100% - 20px));z-index:1200;padding:8px;box-sizing:border-box;background:rgba(2,12,21,.95);border:1px solid #28616a;border-radius:7px;font-size:12px;color:#d8edf6}#conversationCaptions[hidden]{display:none}#conversationCaptionText{max-height:58px;overflow:auto;white-space:pre-wrap;line-height:1.4}#conversationDraft{box-sizing:border-box;width:100%;font-size:16px;background:#071827;color:white;border:1px solid #28616a;border-radius:5px;padding:7px}#conversationDraftActions{display:flex;gap:6px;margin-top:6px}#conversationPanel :focus-visible,#conversationCaptions :focus-visible{outline:2px solid #ffd166;outline-offset:2px}`;document.head.appendChild(style);
 const main=$('.main'),toolbar=$('.toolbar');
 const button=document.createElement('button');button.className='mode';button.id='conversationButton';button.textContent='CONVERSATION';toolbar.appendChild(button);
 const stop=document.createElement('button');stop.className='mode';stop.id='conversationStop';stop.textContent='STOP';stop.setAttribute('aria-label','Stop speech and cancel the current response');toolbar.appendChild(stop);
 const panel=document.createElement('section');panel.id='conversationPanel';panel.setAttribute('aria-label','Conversation threads and voice preferences');panel.innerHTML=`<div class="ca"><b>CONVERSATION</b><button id="conversationClose">Close</button></div><small id="conversationStorage">Threads and voice preferences are saved on this device.</small><label for="conversationThread">Conversation thread</label><select id="conversationThread"></select><div class="ca"><input id="conversationNewName" aria-label="New thread name" placeholder="New thread name"><button id="conversationNew">NEW THREAD</button><button id="conversationRecap">RECAP THIS THREAD</button></div><div id="conversationClarify"></div><div id="conversationTranscript"></div><h3>Voice & response style</h3><label for="conversationSpeed">Speaking speed</label><input id="conversationSpeed" type="range" min="0.65" max="1.5" step="0.05"><small id="conversationSpeedValue"></small><label for="conversationLength">Response length</label><select id="conversationLength"><option value="brief">Brief</option><option value="balanced">Balanced</option><option value="detailed">Detailed</option></select><label for="conversationTone">Tone</label><select id="conversationTone"><option value="calm">Calm</option><option value="warm">Warm</option><option value="direct">Direct</option></select><label><input id="conversationReview" type="checkbox" style="width:auto"> Review spoken requests before sending</label><label for="conversationPronunciation">Pronunciations: one name = spoken spelling per line</label><textarea id="conversationPronunciation" rows="3" placeholder="Eirden = Air den"></textarea><small>Your current voice remains selected. Speed changes playback; tone and length change the wording.</small><div class="ca"><button id="conversationSave">SAVE PREFERENCES</button></div><div id="conversationNotice" role="status"></div>`;main.appendChild(panel);
 const captions=document.createElement('section');captions.id='conversationCaptions';captions.hidden=true;captions.setAttribute('aria-label','Speech captions');captions.innerHTML='<div id="conversationCaptionLabel"></div><div id="conversationCaptionText" aria-live="polite"></div><div id="conversationReviewBox" hidden><textarea id="conversationDraft" rows="2" aria-label="Review or correct your spoken request"></textarea><div id="conversationDraftActions"><button id="conversationDraftSend">SEND REQUEST</button><button id="conversationDraftCancel">CANCEL</button></div></div>';main.appendChild(captions);
 function status(t){$('#cs').textContent=t}
 function caption(label,text){captions.hidden=false;$('#conversationCaptionLabel').textContent=label;$('#conversationCaptionText').textContent=text}
 function render(){
  const select=$('#conversationThread');select.replaceChildren();for(const t of db.state.threads){const o=document.createElement('option');o.value=t.id;o.textContent=t.name;select.appendChild(o)}select.value=db.state.active;
  const clarification=$('#conversationClarify');clarification.replaceChildren();const pending=db.get().pending;if(pending){const question=document.createElement('p');question.textContent=pending.question;clarification.appendChild(question);for(const name of (pending.options||[]).slice(0,6)){const choice=document.createElement('button');choice.textContent=name;choice.onclick=()=>command(name);clarification.appendChild(choice)}const cancel=document.createElement('button');cancel.textContent='CANCEL CLARIFICATION';cancel.onclick=()=>command('Cancel clarification');clarification.appendChild(cancel)}
  const box=$('#conversationTranscript');box.replaceChildren();for(const t of db.get().turns.slice(-30)){const p=document.createElement('p');p.textContent=(t.role==='user'?'YOU: ':'SCOTTY: ')+t.text+(t.status==='cancelled'?' [interrupted]':'');box.appendChild(p)}box.scrollTop=box.scrollHeight;
  $('#conversationStorage').textContent=db.persisted()?'Threads and voice preferences are saved on this device.':'Browser storage is full or unavailable. This conversation may not survive a reload.';
 }
 function fillPrefs(){for(const [id,key] of [['Speed','speed'],['Length','length'],['Tone','tone'],['Pronunciation','pronunciations']])$('#conversation'+id).value=prefs[key];$('#conversationReview').checked=prefs.review;$('#conversationSpeedValue').textContent=prefs.speed.toFixed(2)+'×'}
 function savePrefs(){prefs=core.preferences({speed:$('#conversationSpeed').value,length:$('#conversationLength').value,tone:$('#conversationTone').value,review:$('#conversationReview').checked,pronunciations:$('#conversationPronunciation').value});try{localStorage.setItem(core.prefsKey,JSON.stringify(prefs));$('#conversationNotice').textContent='Preferences saved.'}catch{$('#conversationNotice').textContent='Preferences apply now, but could not be saved.'}fillPrefs()}
 function interrupt(message='Response stopped.'){
  ++run;++speechRun;request?.abort();request=null;busy=false;window.SCOTTYVoiceTransport?.stop();speaking=false;try{clearVoiceBuffers()}catch{}status(message);return run;
 }
 function cancelDraft(){draft='';$('#conversationReviewBox').hidden=true}
 function showDraft(text){draft=text;caption('YOU • REVIEW BEFORE SENDING',text);$('#conversationDraft').value=text;$('#conversationReviewBox').hidden=false;status('REVIEW SPOKEN REQUEST');}
 window.SCOTTYConversation={get listenDuringSpeech(){return true},get preferences(){return {...prefs}},caption,interrupt,db};
 // Route all legacy memory history access through the active thread.
 if(window.SCOTTYMemory){SCOTTYMemory.remember=(role,text)=>{db.remember(role,text);render()};SCOTTYMemory.recall=()=>db.history()}
 const priorSpeak=speak;
 speak=async function(text){
  const seq=++speechRun;spokenText=String(text||'');caption('SCOTTY',spokenText);await priorSpeak(text);
  if(seq===speechRun){convoUntil=Date.now()+90000;$('#conversationCaptionLabel').textContent='SCOTTY • LAST RESPONSE';spokenText=''}
 };
 const priorCommand=command,priorHeard=heard;
 function controls(raw){
  const n=String(raw||'').trim().replace(/^(?:hey\s+)?(?:scotty|scottie|scoty|scotti)[,.:;\s-]*/i,'').trim();
  if(/^(?:stop|stop speaking|quiet|cancel (?:that|response)|pause speech)[.!?]*$/i.test(n)){interrupt();cancelDraft();return {done:true}}
  const change=n.match(/^(?:change that|instead)[,:\s-]*(.*)$/i);if(change){interrupt();cancelDraft();if(!change[1]){status('WHAT SHOULD I CHANGE?');caption('YOU','Tell me what to change.');return {done:true}}return {text:change[1]}}
  return {text:n};
 }
 async function bridge(text,body,signal){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),60000),abort=()=>ctl.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)ctl.abort();
  try{const r=await fetch('/api/hud/command',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({text,...body}),signal:ctl.signal});const j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'Conversation request failed');return j}finally{clearTimeout(timer);signal.removeEventListener('abort',abort)}
 }
 command=async function(raw){
  raw=String(raw||$('#ci').value||'').trim();if(!raw)return;convoUntil=Date.now()+90000;$('#ci').value='';
  const control=controls(raw);if(control.done)return;let text=control.text;
  const threadMatch=text.match(/^(?:switch to|open|resume) (?:the )?(?:conversation |thread )?(.+?) (?:thread|conversation)$/i);
  if(threadMatch){const t=db.state.threads.find(t=>t.name.toLowerCase()===threadMatch[1].toLowerCase());if(t){interrupt();cancelDraft();db.switch(t.id);render();caption('THREAD',t.name);return}caption('THREAD','No thread named '+threadMatch[1]+'. Create one in Conversation.');return}
  const memorySpace=window.SCOTTYKnowledge?.space()||'shared';
  const seq=interrupt('THINKING'),threadId=db.state.active,t=db.get(threadId),history=db.history(threadId,memorySpace);cancelDraft();busy=true;request=new AbortController();const signal=request.signal;
  const remember=(role,text)=>db.remember(role,text,threadId,{memorySpace});
  const recap=/^(?:what did we decide|recap(?: this| our| the)?(?: conversation| thread)?|summari[sz]e (?:this|our|the) (?:conversation|thread))[?!.]*$/i.test(text);
  const pending=/^(?:cancel clarification|never mind|start over)[.!?]*$/i.test(text)?null:t.pending;
  if(!pending&&t.pending){db.pending(null,threadId);busy=false;render();caption('SCOTTY','Clarification cancelled. Tell me your new request.');return}
  let resolutions=[];
  if(pending?.canvasPrefix&&!recap){text=pending.canvasPrefix+text}
  else if(pending?.original&&pending?.kind&&!recap){resolutions=[...(pending.resolutions||[]).filter(x=>!(x.kind===pending.kind&&x.query===pending.query)),{kind:pending.kind,query:pending.query,answer:text}];text=pending.original}
  remember('user',control.text);render();caption('YOU',control.text);
  try{
   if(recap&&!history.length){const reply='No earlier conversation is recorded in this thread and memory space yet.';remember('assistant',reply);await speak(reply);return}
   const apps=recap?null:await window.SCOTTYApps?.handleCommand(text,{signal});if(seq!==run||signal.aborted)return;
   if(apps?.handled){db.pending(null,threadId);remember('assistant',apps.reply);render();await speak(apps.reply);return}
   const team=recap?null:await window.SCOTTYTeamwork?.handleCommand(text,{signal});if(seq!==run||signal.aborted)return;
   if(team?.handled){db.pending(null,threadId);remember('assistant',team.reply);render();await speak(team.reply);return}
   const knowledge=recap?null:await window.SCOTTYKnowledge?.handleCommand(text,{signal});if(seq!==run||signal.aborted)return;
   if(knowledge?.handled){db.pending(null,threadId);remember('assistant',knowledge.reply);render();await speak(knowledge.reply);return}
   const daily=recap?null:await window.SCOTTYDaily?.handleCommand(text,{signal});if(seq!==run||signal.aborted)return;
   if(daily?.handled){db.pending(null,threadId);remember('assistant',daily.reply);render();await speak(daily.reply);return}
   const canvas=recap?null:eyesVoiceCommand(text);
   if(canvas){const query=text.match(/^(?:find|focus|show|open|go to) (?:my |the )?(agent|chief|project|task|file|folder|node) (?:named |called )?(.+)$/i);db.pending(query&&/^(?:I found|No .+ named)/.test(canvas)?{question:canvas,canvasPrefix:text.slice(0,text.length-query[2].length),options:window.SCOTTYSpatial?.searchNodes(query[2],query[1]==='node'?'all':query[1]).slice(0,6).map(n=>n.name)||[]}:null,threadId);remember('assistant',canvas);await speak(canvas);return}
   const structured=!recap&&!pending&&/^\s*(?:(?:open|show)\s+(?:live ops|missions?|mission control)|(?:start|create|launch)\s+(?:a\s+)?(?:(?:autonomous|auto)\s+)?mission(?:\s+(?:to|for))?|(?:ask|tell|bring in)\s+[^:]+:|(?:approve|approved|approve it|yes approve)|(?:remember|save to memory)\b|(?:show|list|open)\s+(?:my\s+)?(?:agent\s+)?(?:mission\s+history|previous\s+missions)\s*$|(?:continue|resume)\s+(?:agent\s+)?mission\s+[0-9a-f-]{36}\s*:|(?:assemble|coordinate|assign)\s+(?:the\s+)?(?:best\s+)?(?:agents|chiefs|team)\s+(?:to|for)\s+)/i.test(text);
   if(structured){await priorCommand(text);return}
   const r=await bridge(text,{history,preferences:prefs,mode:recap?'recap':'conversation',resolutions,memorySpace:window.SCOTTYKnowledge?.space()||'shared'},signal);
   if(seq!==run||signal.aborted)return;
   db.pending(r.clarification?{...r.clarification,resolutions}:null,threadId);remember('assistant',r.reply||'No response returned.');
   if(r.focusNode){await loadResources();if(seq!==run)return;window.SCOTTYSpatial?.refresh();window.SCOTTYSpatial?.focusId(r.focusNode)}
   window.SCOTTYKnowledge?.showSources(r.sources||[]);
   status(r.clarification?'CLARIFICATION NEEDED':'RESPONSE READY');render();await speak(r.reply||'No response returned.');
  }catch(e){if(seq!==run||signal.aborted)return;caption('CONVERSATION ERROR',e.message);status('CONVERSATION ERROR')}
  finally{if(seq===run){busy=false;request=null;render()}}
 };
 heard=async function(raw){
  raw=String(raw||'').trim();if(!raw)return;
  const named=/^(?:hey\s+)?(?:scotty|scottie|scoty|scotti)\b/i.test(raw),control=controlsPreview(raw);
  // While audio is playing, require the wake name and an explicit interruption to avoid acting on speaker echo.
  if(speaking||busy){if(named&&control){const c=controls(raw);if(c.text){if(prefs.review)showDraft(c.text);else await command(c.text)}return}return}
  if(control){const c=controls(raw);if(c.text){if(prefs.review)showDraft(c.text);else await command(c.text)}return}
  if(!named&&Date.now()>=convoUntil)return;
  convoUntil=Date.now()+90000;
  const cleaned=raw.replace(/^(?:hey\s+)?(?:scotty|scottie|scoty|scotti)[,.:;\s-]*/i,'').trim();
  if(/^(?:eyes|vision) (?:on|off)[.!?]*$/i.test(cleaned)||/^(?:on deck)[.!?]*$/i.test(cleaned)){caption('YOU',raw);return priorHeard(raw)}
  if(prefs.review){showDraft(cleaned);return}await command(cleaned);
 };
 function controlsPreview(raw){const n=String(raw).replace(/^(?:hey\s+)?(?:scotty|scottie|scoty|scotti)[,.:;\s-]*/i,'').trim();return /^(?:stop(?: speaking)?|quiet|cancel (?:that|response)|pause speech)[.!?]*$/i.test(n)||/^(?:change that|instead)\b/i.test(n)}
 let voiced=false,quiet=0,total=0;
 window.SCOTTYConversation.captureFrame=function(input,sampleRate){
  const seconds=input.length/sampleRate;let power=0;for(const n of input)power+=n*n;const rms=Math.sqrt(power/input.length);
  if(rms>.012)voiced=true;
  if(!voiced)return;
  const copy=new Float32Array(input.length);copy.set(input);localVoiceBuffers.push(copy);localVoiceSamples+=copy.length;total+=seconds;quiet=rms>.012?0:quiet+seconds;
  if((quiet>=.55&&total>=.35)||total>=10){voiced=false;quiet=0;total=0;if(!localVoiceSending)sendVoiceChunk();else clearVoiceBuffers()}
 };
 button.onclick=()=>{panel.classList.toggle('open');render();fillPrefs()};$('#conversationClose').onclick=()=>panel.classList.remove('open');stop.onclick=()=>{interrupt();cancelDraft()};
 $('#conversationThread').onchange=e=>{interrupt();cancelDraft();db.switch(e.target.value);caption('THREAD',db.get().name);render()};
 $('#conversationNew').onclick=()=>{try{interrupt();cancelDraft();db.add($('#conversationNewName').value);$('#conversationNewName').value='';render();caption('THREAD',db.get().name)}catch(e){$('#conversationNotice').textContent=e.message}};
 $('#conversationRecap').onclick=()=>command('Recap this conversation');$('#conversationSave').onclick=savePrefs;$('#conversationSpeed').oninput=e=>$('#conversationSpeedValue').textContent=Number(e.target.value).toFixed(2)+'×';
 $('#conversationDraftSend').onclick=()=>{const text=$('#conversationDraft').value.trim();cancelDraft();if(text)command(text)};$('#conversationDraftCancel').onclick=()=>{cancelDraft();caption('YOU','Spoken request cancelled.');status('LISTENING')};
 window.SCOTTYConversation.resetCapture=()=>{voiced=false;quiet=0;total=0};
 window.SCOTTYConversation.pronounce=text=>core.pronounce(text,prefs.pronunciations);window.SCOTTYConversation.controls=controls;window.SCOTTYConversation.getRun=()=>run;
 window.SCOTTYConversation.legacyResponse=async(text,token,threadId)=>{if(token!==run)return;db.remember('assistant',text,threadId,{memorySpace:window.SCOTTYKnowledge?.space()||'shared'});render();await speak(text)};
 render();fillPrefs();
})();
