(function(){
 if(window.__SCOTTY_SCOTTISH_HUD_V1__)return;
 window.__SCOTTY_SCOTTISH_HUD_V1__=true;
 // Scottish audio is synthesized by the authenticated hosted Piper AWB worker.
 const base='/api/voice/scottish';
 const $=id=>document.querySelector(id);
 function setStatus(v){const el=$('#vs');if(el)el.textContent=v}
 function setCommand(v){const el=$('#cs');if(el)el.textContent=v}
 async function responseError(r){
  let j={};try{j=await r.json()}catch{}
  return new Error(String(j.error||j.detail||('HTTP '+r.status)).slice(0,250));
 }
 let bufferPlayer=null;let generation=0,active=null,player=null,voiceState='READY',pendingPlayback=null,progressTimer=null;
 const audioEl=document.createElement('audio');audioEl.setAttribute('playsinline','');audioEl.style.display='none';document.body.appendChild(audioEl);

 const recovery=document.createElement('section');recovery.id='scottySpeechRecovery';recovery.hidden=true;
 recovery.setAttribute('role','status');recovery.style.cssText='position:absolute;left:10px;right:10px;bottom:84px;z-index:2400;background:#061827;color:#ddf8ff;border:1px solid #5eeaff;border-radius:8px;padding:12px;font:14px system-ui;';
 const recoveryText=document.createElement('p');recoveryText.id='scottySpeechRecoveryText';recovery.appendChild(recoveryText);
 (document.querySelector('.main')||document.body).appendChild(recovery);
 function showRecovery(message){recoveryText.textContent=message;recovery.hidden=!message;}
 window.SCOTTYVoiceRecovery={show:showRecovery};

 function showPlayButton(show){
  let btn=document.getElementById('scottyPlayReadyAudio');
  if(!btn){btn=document.createElement('button');btn.id='scottyPlayReadyAudio';btn.textContent='▶ PLAY PIPER VOICE';btn.style.cssText='display:none;width:100%;margin-top:8px;background:#12313b;color:#b8f9f0;border:1px solid #58a8b1;padding:10px;border-radius:8px;font-weight:bold';btn.onclick=()=>{primeAudio();if(pendingPlayback)pendingPlayback()};recovery.appendChild(btn)}
  btn.style.display=show?'block':'none';if(show)showRecovery('Your Scottish reply is ready. Tap Play to allow audio on this iPad.');else if(voiceState==='SPEAKING')showRecovery('');
 }
 // iPad Safari requires audio playback to originate from a user gesture.
 // A reusable audio element is activated by the TEST tap; delayed playback has a tap-to-play fallback.
 function primeAudio(){
  try{
   if(typeof unlockAudio==='function')Promise.resolve(unlockAudio()).catch(()=>{});
   if(player)return;audioEl.src='data:audio/wav;base64,UklGRtwBAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YbgBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';audioEl.muted=true;
   const primedSrc=audioEl.src,p=audioEl.play();
   if(p&&p.then)p.then(()=>{if(!player&&audioEl.src===primedSrc){audioEl.pause();audioEl.muted=false;}}).catch(()=>{if(!player)audioEl.muted=false;});
  }catch(e){audioEl.muted=false}
 }
 document.addEventListener('pointerdown',e=>{if(e.target.closest('#testVoice,#scottyScottishPreview,#mic,#send,#scottyPlayReadyAudio'))primeAudio()},true);

 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 function state(value){
  voiceState=value;
  setStatus('SCOTTISH VOICE '+value);
  const badge=document.getElementById('scottyVoiceQueueStatus');
  if(badge)badge.textContent='VOICE: '+value;
  const test=$('#testVoice');if(test)test.textContent=value==='GENERATING'||value==='SPEAKING'||value==='BUSY'?'REPLACE VOICE TEST':'TEST PIPER VOICE';
 }
 function stopCurrent(){
  if(bufferPlayer){try{bufferPlayer.stop(0)}catch{}bufferPlayer=null;}
  if(acknowledgement){try{acknowledgement.pause()}catch{}acknowledgement=null}
  if(progressTimer){clearInterval(progressTimer);progressTimer=null}
  pendingPlayback=null;showPlayButton(false);showRecovery('');
  if(active){active.abort();active=null}
  if(player){try{player.pause();player.src=''}catch{}player=null}
 }
 async function queueRequest(text,signal){
  // The hosted Piper engine is single-worker. A full queue means retry the latest phrase,
  // never submit parallel jobs or create a backlog of obsolete utterances.
  for(let attempt=0;attempt<7;attempt++){
   if(signal.aborted)throw new DOMException('Superseded','AbortError');
   const r=await fetch(base+'/speak',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({text:text.slice(0,190)}),signal});
   if(r.ok){const j=await r.json();if(!j.job_id)throw Error('Scottish queue returned no job ID');return j.job_id}
   const err=await responseError(r);
   if(r.status!==429&&!/queue full|busy/i.test(err.message))throw err;
   state('BUSY');setCommand('VOICE BUSY • WAITING FOR SCOTTISH WORKER');
   if(attempt===6)throw Error('Scottish voice queue remains full. Wait for old jobs to finish.');
   await sleep(2500+attempt*1500);
  }
 }

 async function playUnlockedAudio(blob,signal,seq){
  const ctx=typeof audioCtx!=='undefined'?audioCtx:null;
  if(!ctx||ctx.state!=='running')return false;
  const bytes=await blob.arrayBuffer();
  let decoded;try{decoded=await ctx.decodeAudioData(bytes.slice(0));}catch(e){if(signal.aborted)throw new DOMException('Superseded','AbortError');return false;}
  if(signal.aborted||seq!==generation)throw new DOMException('Superseded','AbortError');
  await new Promise((resolve,reject)=>{
   const source=ctx.createBufferSource();bufferPlayer=source;source.buffer=decoded;source.playbackRate.value=window.SCOTTYConversation?.preferences.speed||1;source.connect(ctx.destination);
   let done=false;const abort=()=>{try{source.stop(0)}catch{}finish(new DOMException('Superseded','AbortError'));};
   const finish=error=>{if(done)return;done=true;clearTimeout(timer);source.onended=null;signal.removeEventListener('abort',abort);if(bufferPlayer===source)bufferPlayer=null;try{source.disconnect()}catch{}error?reject(error):resolve();};
   const timer=setTimeout(()=>{try{source.stop(0)}catch{}finish(Error('Scottish audio playback timed out'));},Math.max(20000,Math.ceil(decoded.duration*1000/source.playbackRate.value)+8000));
   source.onended=()=>finish();signal.addEventListener('abort',abort,{once:true});
   if(signal.aborted)return abort();
   state('SPEAKING');setCommand('SPEAKING');showRecovery('');
   try{source.start(0);}catch(e){finish(e);}
  });
  return true;
 }

 async function playScottish(text,seq,controller){
  const signal=controller.signal;
  const generationDeadline=setTimeout(()=>controller.abort(new DOMException('Scottish voice generation timed out. You can keep giving commands.','TimeoutError')),95000);
  try{
  const warming=Date.now();if(progressTimer)clearInterval(progressTimer);progressTimer=setInterval(()=>{if(seq!==generation)return;const elapsed=Math.floor((Date.now()-warming)/1000);setStatus('SCOTTISH VOICE STARTING • '+elapsed+'S');const msg=$('#voiceMsg');if(msg)msg.textContent=elapsed>5?'The free Scottish voice host may be waking from sleep. Commands can still interrupt this request.':'Starting Scottish speech…';},1000);
  const jobId=await queueRequest(text,signal);
  state('GENERATING');setCommand('VOICE GENERATING');
  const started=Date.now();
  if(progressTimer)clearInterval(progressTimer);
  progressTimer=setInterval(()=>{
   if(seq!==generation){clearInterval(progressTimer);progressTimer=null;return}
   const elapsed=Math.floor((Date.now()-started)/1000);
   if(voiceState==='GENERATING'){
    setStatus('SCOTTISH VOICE GENERATING • '+elapsed+'S');
    const msg=$('#voiceMsg');
    if(msg)msg.textContent=elapsed<180?'Piper generating audio ('+elapsed+' seconds).':'Generation is taking unusually long ('+elapsed+' seconds). Check the hosted worker.';
   }
  },1000);
  for(let n=0;n<160;n++){
   if(signal.aborted||seq!==generation)throw new DOMException('Superseded','AbortError');
   await sleep(1200);
   const r=await fetch(base+'/jobs/'+encodeURIComponent(jobId),{credentials:'include',cache:'no-store',signal});
   if(!r.ok)throw await responseError(r);
   const x=await r.json();
   if(x.state==='error'||x.state==='failed'||x.state==='cancelled')throw Error(x.error||'Piper voice generation failed');
   if(x.state==='complete'){
    if(acknowledgement){try{acknowledgement.pause()}catch{}acknowledgement=null}
    if(progressTimer){clearInterval(progressTimer);progressTimer=null}
    const audio=await fetch(base+'/jobs/'+encodeURIComponent(jobId)+'/audio',{credentials:'include',signal});
    if(!audio.ok)throw await responseError(audio);
    const blob=await audio.blob();
    if(!blob.size)throw Error('Scottish audio empty');
    if(signal.aborted||seq!==generation)throw new DOMException('Superseded','AbortError');
    clearTimeout(generationDeadline);
    if(await playUnlockedAudio(blob,signal,seq))return;
    const url=URL.createObjectURL(blob);
    try{
     await new Promise((resolve,reject)=>{
      const a=audioEl;player=a;a.pause();a.src=url;a.muted=false;a.volume=1;a.playbackRate=window.SCOTTYConversation?.preferences.speed||1;
      let done=false;
      const finish=e=>{if(done)return;done=true;clearTimeout(timer);a.onended=null;a.onerror=null;pendingPlayback=null;showPlayButton(false);if(player===a)player=null;e?reject(e):resolve()};
      const timer=setTimeout(()=>finish(Error('Playback timed out')),180000);
      signal.addEventListener('abort',()=>{a.pause();finish(new DOMException('Superseded','AbortError'))},{once:true});
      a.onended=()=>finish();a.onerror=()=>finish(Error('Scottish audio playback failed'+(a.error?.code?' (media code '+a.error.code+')':'')));
      const begin=()=>{
       if(signal.aborted||seq!==generation)return finish(new DOMException('Superseded','AbortError'));
       pendingPlayback=null;showPlayButton(false);state('SPEAKING');setCommand('SPEAKING');
       const p=a.play();
       if(p&&p.catch)p.catch(e=>{
        if(e?.name==='NotAllowedError'){
         state('READY TO PLAY');setCommand('TAP PLAY TO HEAR SCOTTY');
         pendingPlayback=begin;showPlayButton(true);
        }else finish(e);
       });
      };
      begin();
     });
    }finally{URL.revokeObjectURL(url)}
    return;
   }
  }
  throw Error('Piper voice generation timed out');
  }finally{clearTimeout(generationDeadline)}
 }
 let acknowledgement=null;
 async function acknowledge(seq){
  try{
   const r=await fetch(base+'/ack',{credentials:'include',signal:active?.signal});
   if(!r.ok)return;
   const blob=await r.blob();if(!blob.size||seq!==generation)return;
   const url=URL.createObjectURL(blob),a=new Audio(url);
   acknowledgement=a;
   a.onended=()=>{URL.revokeObjectURL(url);if(acknowledgement===a)acknowledgement=null};
   a.onerror=()=>{URL.revokeObjectURL(url);if(acknowledgement===a)acknowledgement=null};
   await a.play();
  }catch(e){console.debug('Scottish acknowledgement unavailable',e)}
 }
 speak=async function(text){
  text=String(text||'').trim();if(!text)return;
  const seq=++generation;
  stopCurrent();
  const controller=new AbortController();active=controller;
  speaking=true;state('GENERATING');setCommand('SCOTTISH VOICE');
  try{
   // No prerecorded acknowledgement: speak only newly generated responses.
   const spoken=window.SCOTTYConversation?.pronounce(text)||text;
   const parts=window.SCOTTYConversationCore?.chunks(spoken,190)||[spoken.slice(0,190)];
   for(const part of parts){if(seq!==generation||controller.signal.aborted)throw new DOMException('Superseded','AbortError');await playScottish(part,seq,controller)}
   if(seq===generation){state(voiceArmed?'LISTENING':'READY');setCommand(voiceArmed?'LISTENING':'READY');const msg=$('#voiceMsg');if(msg)msg.textContent='Scottish voice ready • Piper AWB male. Replies are generated live.';}
  }catch(e){
   if(seq!==generation)return;
   console.warn('S.C.O.T.T.Y. Scottish voice',e);
   state('ERROR');setCommand(voiceArmed?'VOICE UNAVAILABLE • LISTENING':'VOICE UNAVAILABLE • COMMANDS READY');
   const detail='Scottish voice: '+String(e?.message||e).slice(0,180);const msg=$('#voiceMsg');if(msg)msg.textContent=detail;window.SCOTTYVoiceRecovery?.show(detail+'. Open Voice and tap Check voice connection, then Test Piper Voice to retry.');
  }finally{
   if(seq===generation){if(progressTimer){clearInterval(progressTimer);progressTimer=null}active=null;speaking=false;try{clearVoiceBuffers()}catch{}}
  }
 };
 window.SCOTTYVoiceTransport={stop(){++generation;stopCurrent();speaking=false;state(voiceArmed?'LISTENING':'READY')},get state(){return voiceState},async check(){const r=await fetch(base+'/health',{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(95000)});if(!r.ok)throw await responseError(r);const data=await r.json();if(data.ok===false||data.ready===false)throw Error('The voice gateway responded, but its worker is not ready.');return {reachable:true};}};
  const previousCommand=command;
  command=async function(t){
    const token=window.SCOTTYConversation?.getRun(),thread=window.SCOTTYConversation?.db.state.active;
    const reply=text=>window.SCOTTYConversation?window.SCOTTYConversation.legacyResponse(text,token,thread):speak(text);
    const n=String(t||'').toLowerCase().replace(/[.!?]+$/,'').trim();
    if(/^(approve|approved|approve it|yes approve|yes approved)$/.test(n)){
      try{
        document.querySelector('#cs').textContent='CHECKING APPROVAL';
        const p=await api('/api/approvals?status=pending');
        const list=(p.approvals||[]).slice().sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0));
        if(!list.length){await reply('There is no pending action waiting for approval.');return}
        const newest=list[0];
        const age=Date.now()-Date.parse(newest.createdAt||0);
        if(!(age>=0&&age<15*60*1000)){await reply('The pending actions are not recent enough for me to guess. Open Live Ops and choose the action.');return}
        document.querySelector('#cs').textContent='APPROVING ACTION';
        await api('/api/approvals/'+encodeURIComponent(newest.id)+'/approve',{method:'POST',body:'{}'});
        document.querySelector('#cs').textContent='EXECUTING APPROVED ACTION';
        const r=await api('/api/missions/'+encodeURIComponent(newest.missionId)+'/run',{method:'POST',body:'{}'});
        const last=(r.steps||[]).slice(-1)[0];
        const st=r?.mission?.status||'';
        if(st==='completed'||last?.status==='completed') await reply('Approved and completed. '+String(last?.result||'The action finished successfully.'));
        else if(st==='needs_attention'||last?.status==='error') await reply('I approved it, but the provider action needs attention. '+String(last?.result||'Please check Live Ops.'));
        else await reply('Approved. I am continuing the mission.');
        return;
      }catch(e){
        console.warn('S.C.O.T.T.Y. approval',e);
        document.querySelector('#cs').textContent='APPROVAL ERROR';
        return;
      }
    }
    return previousCommand(t);
  };


 function updateVoicePanel(){
  const panel=$('#voiceSettings');if(!panel)return;
  const label=panel.querySelector('label');if(label)label.textContent='Voice provider: hosted Scottish male • Piper AWB';
  const input=$('#elVoiceId');if(input){input.style.display='none';const l=input.previousElementSibling;if(l&&l.tagName==='LABEL')l.style.display='none'}
  const oldLibrary=$('#scottyElevenVoiceLibrary');if(oldLibrary)oldLibrary.style.display='none';
  const save=$('#saveVoice');if(save){save.style.display='none'}
  const msg=$('#voiceMsg');if(msg)msg.textContent='Scottish male Piper voice. Each answer is generated live on the hosted service. The free host may need time to wake after inactivity.';
  const test=$('#testVoice');if(test){test.textContent='TEST PIPER VOICE'}
 }
 const badge=document.createElement('span');badge.id='scottyVoiceQueueStatus';badge.textContent='VOICE: READY';badge.style.cssText='display:inline-block;border:1px solid #28616a;border-radius:8px;padding:5px 8px;color:#92e8e1;font-size:10px;letter-spacing:.08em';const header=document.querySelector('header')||document.querySelector('#vs')?.parentElement;if(header)header.appendChild(badge);
 const preview=document.createElement('button');
 preview.id='scottyScottishPreview';preview.textContent='▶ HEAR SCOTTISH VOICE NOW';
 preview.style.cssText='width:100%;margin-top:8px;background:#12313b;color:#b8f9f0;border:1px solid #58a8b1;padding:10px;border-radius:8px;font-weight:bold';
 preview.onclick=async()=>{primeAudio();await speak('Aye, I am Scotty. Your workspace is ready, and I am here to help.');};
 const panel=$('#voiceSettings');if(panel){panel.appendChild(preview);const check=document.createElement('button');check.textContent='CHECK VOICE CONNECTION';check.id='scottyCheckVoiceConnection';check.onclick=async()=>{const msg=$('#voiceMsg');if(msg)msg.textContent='Checking Scottish voice connection…';try{await window.SCOTTYVoiceTransport.check();if(msg)msg.textContent='Scottish voice gateway reachable. Test Voice checks actual generation and playback.';}catch(e){if(msg)msg.textContent='Scottish voice unavailable: '+e.message+'. Folder and text commands still work.';}};panel.appendChild(check);}

 // Rebind the actual TEST button, bypassing older ElevenLabs handlers.
 // A direct user tap is important for Safari speech permission.
 function bindTest(){
  const btn=$('#testVoice');
  if(!btn)return;
  btn.onclick=null;
  if(btn.dataset.scottyFastBound==='1')return;
  btn.dataset.scottyFastBound='1';
  btn.addEventListener('click',async e=>{
   e.preventDefault();e.stopImmediatePropagation();
   setCommand('VOICE TEST REQUESTED');state('STARTING');
   const msg=$('#voiceMsg');if(msg)msg.textContent='Testing S.C.O.T.T.Y.’s hosted Scottish male voice…';
   try{
    await speak('Aye, S.C.O.T.T.Y. is ready.');
   }catch(err){speaking=false;state('ERROR');setCommand('VOICE TEST FAILED');if(msg)msg.textContent='Voice test error: '+String(err?.message||err)}
  },true);
 }
 bindTest();
 const settings=$('#voiceSettingsBtn');if(settings)settings.addEventListener('click',()=>setTimeout(()=>{updateVoicePanel();bindTest()},0));
 state('READY');
})();
