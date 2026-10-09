(function(){
  if(window.__SCOTTY_VOICE_APPROVAL_V3__) return;
  window.__SCOTTY_VOICE_APPROVAL_V3__=true;

  function chosenVoice(){
    return String(localStorage.getItem('scottyElevenVoiceId')||document.querySelector('#elVoiceId')?.value||'cVJh6uKaUowPTE2Nt6UF').trim();
  }

  async function playEleven(text){
    const r=await fetch('/api/tts',{
      method:'POST',
      credentials:'include',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({text,voiceId:chosenVoice(),voiceSettings:{speed:.98,stability:.38,style:.08}})
    });
    if(!r.ok) throw new Error('ElevenLabs '+r.status);
    const blob=await r.blob();
    if(!blob.size) throw new Error('Empty ElevenLabs audio');
    const url=URL.createObjectURL(blob);
    try{
      await new Promise((resolve,reject)=>{
        const a=new Audio(url);
        a.playsInline=true;
        a.volume=1;
        let done=false;
        const finish=(err)=>{if(done)return;done=true;clearTimeout(tm);a.onended=null;a.onerror=null;err?reject(err):resolve()};
        const tm=setTimeout(()=>finish(new Error('Voice timeout')),90000);
        a.onended=()=>finish();
        a.onerror=()=>finish(new Error('Voice playback failed'));
        const p=a.play();
        if(p&&p.catch)p.catch(finish);
      });
    }finally{URL.revokeObjectURL(url)}
  }

  speak=async function(text){
    text=String(text||'').trim();
    if(!text)return;
    speaking=true;
    document.querySelector('#vs').textContent='SCOTTY SPEAKING';
    document.querySelector('#cs').textContent='SPEAKING';
    try{
      await playEleven(text);
      document.querySelector('#vs').textContent='ELEVENLABS VOICE';
      document.querySelector('#cs').textContent=voiceArmed?'LISTENING':'READY';
    }catch(e){
      console.warn('S.C.O.T.T.Y. voice',e);
      document.querySelector('#vs').textContent='ELEVENLABS VOICE ERROR';
      document.querySelector('#cs').textContent='OPEN VOICE SETTINGS • TEST VOICE';
    }finally{
      speaking=false;
      try{clearVoiceBuffers()}catch{}
    }
  };

  const previousCommand=command;
  command=async function(t){
    const n=String(t||'').toLowerCase().replace(/[.!?]+$/,'').trim();
    if(/^(approve|approved|approve it|yes approve|yes approved)$/.test(n)){
      try{
        document.querySelector('#cs').textContent='CHECKING APPROVAL';
        const p=await api('/api/approvals?status=pending');
        const list=(p.approvals||[]).slice().sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0));
        if(!list.length){await speak('There is no pending action waiting for approval.');return}
        const newest=list[0];
        const age=Date.now()-Date.parse(newest.createdAt||0);
        if(!(age>=0&&age<15*60*1000)){await speak('The pending actions are not recent enough for me to guess. Open Live Ops and choose the action.');return}
        document.querySelector('#cs').textContent='APPROVING ACTION';
        await api('/api/approvals/'+encodeURIComponent(newest.id)+'/approve',{method:'POST',body:'{}'});
        document.querySelector('#cs').textContent='EXECUTING APPROVED ACTION';
        const r=await api('/api/missions/'+encodeURIComponent(newest.missionId)+'/run',{method:'POST',body:'{}'});
        const last=(r.steps||[]).slice(-1)[0];
        const st=r?.mission?.status||'';
        if(st==='completed'||last?.status==='completed') await speak('Approved and completed. '+String(last?.result||'The action finished successfully.'));
        else if(st==='needs_attention'||last?.status==='error') await speak('I approved it, but the provider action needs attention. '+String(last?.result||'Please check Live Ops.'));
        else await speak('Approved. I am continuing the mission.');
        return;
      }catch(e){
        console.warn('S.C.O.T.T.Y. approval',e);
        document.querySelector('#cs').textContent='APPROVAL ERROR';
        return;
      }
    }
    return previousCommand(t);
  };

  const save=document.querySelector('#saveVoice');
  if(save)save.addEventListener('click',()=>{
    const input=document.querySelector('#elVoiceId');
    if(input&&input.value.trim())localStorage.setItem('scottyElevenVoiceId',input.value.trim());
  });

  async function ensureVoiceLibrary(){
    const panel=document.querySelector('#voiceSettings');
    const input=document.querySelector('#elVoiceId');
    const msg=document.querySelector('#voiceMsg');
    if(!panel||!input)return;
    let sel=document.querySelector('#scottyElevenVoiceLibrary');
    if(!sel){
      const label=document.createElement('label');
      label.textContent='ElevenLabs Voice Library';
      sel=document.createElement('select');
      sel.id='scottyElevenVoiceLibrary';
      input.parentNode.insertBefore(label,input);
      input.parentNode.insertBefore(sel,input);
      sel.addEventListener('change',()=>{
        if(sel.value){
          input.value=sel.value;
          localStorage.setItem('scottyElevenVoiceId',sel.value);
          if(msg)msg.textContent='ElevenLabs voice selected. Tap TEST to hear it.';
        }
      });
    }
    if(sel.dataset.loaded)return;
    sel.innerHTML='<option value="">Loading ElevenLabs voices…</option>';
    try{
      const r=await fetch('/api/voice/voices',{credentials:'include',cache:'no-store'});
      const j=await r.json();
      if(!r.ok||!j.ok)throw new Error(j.error||'Unable to load voices');
      sel.innerHTML='<option value="">Choose an ElevenLabs voice…</option>';
      for(const v of j.voices||[]){
        const o=document.createElement('option');
        o.value=v.voiceId;
        o.textContent=v.name+(v.category?' • '+v.category:'');
        sel.appendChild(o);
      }
      const cur=chosenVoice();
      sel.value=cur;
      input.value=cur;
      sel.dataset.loaded='1';
      if(msg)msg.textContent='ElevenLabs voices loaded. Choose one, SAVE, then TEST.';
    }catch(e){
      if(msg)msg.textContent='Could not load ElevenLabs voices: '+e.message;
    }
  }

  const voiceButton=document.querySelector('#voiceSettingsBtn');
  if(voiceButton)voiceButton.addEventListener('click',()=>setTimeout(ensureVoiceLibrary,0));
  const test=document.querySelector('#testVoice');
  if(test)test.addEventListener('click',()=>{
    const input=document.querySelector('#elVoiceId');
    if(input&&input.value.trim())localStorage.setItem('scottyElevenVoiceId',input.value.trim());
  });
})();