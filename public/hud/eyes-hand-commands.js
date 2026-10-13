/* Additive Eyes On command palette. Does not change camera, hand landmarks, or existing gestures. */
(function(){
  const start=()=>{
    const main=document.querySelector('.main');
    if(!main||document.getElementById('eyesHandMenu'))return;
    const launch=document.createElement('button');
    launch.id='eyesHandMenu';launch.type='button';launch.textContent='HAND COMMANDS';
    launch.style.cssText='position:absolute;top:46px;right:12px;z-index:40;border:1px solid #5eeaff88;border-radius:7px;background:#061522;color:#ddf8ff;padding:7px 10px;font:10px system-ui;cursor:pointer';
    const menu=document.createElement('div');menu.id='eyesHandPalette';
    menu.style.cssText='display:none;position:absolute;z-index:41;top:78px;right:12px;width:min(300px,80%);max-height:65%;overflow:auto;padding:10px;background:#041321f5;border:1px solid #5eeaff88;border-radius:10px;box-shadow:0 12px 35px #0009';
    const entries=[
      ['Agent Matrix','AGENT MATRIX'],['Live Ops','LIVE OPS'],['Memory Map','MEMORY MAP'],['128 Agents','128 AGENTS'],
      ['Conversation','CONVERSATION'],['Daily Life','DAILY LIFE'],['Knowledge','KNOWLEDGE'],['Voice','VOICE'],
      ['Search Nodes','SEARCH NODES'],['Actions','ACTIONS'],['Creative & Learning','CREATIVE & LEARNING'],
      ['Files & Projects','FILES & PROJECTS'],['Spatial Tools','SPATIAL TOOLS'],['Voice Controls','VOICE CONTROLS'],
      ['Command Room','COMMAND ROOM'],['Voice Workspace','VOICE WORKSPACE'],['Connectors','CONNECTORS'],
      ['Multi-select','MULTI-SELECT'],['Clear Selection','CLEAR SELECTION'],['Undo Canvas Change','UNDO CANVAS CHANGE'],
      ['Reset Node Layout','RESET NODE LAYOUT'],['Call Selected','CALL SELECTED'],['Spread Out','SPREAD OUT'],
      ['Regroup','REGROUP'],['Box Select','BOX SELECT'],['Group Move','GROUP MOVE']
    ];
    const execute=(label)=>{
      const candidates=[...document.querySelectorAll('button')].filter(b=>b!==launch&&!menu.contains(b));
      const norm=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
      const target=candidates.find(b=>norm(b.textContent)===norm(label))||candidates.find(b=>norm(b.textContent).startsWith(norm(label)+' '));
      if(target&&!target.disabled){target.click();menu.style.display='none';return;}
      const status=document.querySelector('#cs');
      if(status)status.textContent='CONTROL UNAVAILABLE • '+label;
    };
    const close=document.createElement('button');close.textContent='CLOSE';close.type='button';
    close.style.cssText='width:100%;padding:8px;margin-bottom:8px;background:#143044;color:white;border:1px solid #5eeaff88;border-radius:6px';
    close.onclick=()=>menu.style.display='none';menu.appendChild(close);
    for(const [title,label] of entries){
      const b=document.createElement('button');b.type='button';b.textContent=title;
      b.style.cssText='display:inline-block;margin:3px;padding:8px;background:#10283b;color:#ddf8ff;border:1px solid #5eeaff55;border-radius:6px;font:11px system-ui';
      b.onclick=()=>execute(label);menu.appendChild(b);
    }
    main.append(launch,menu);
    launch.onclick=()=>menu.style.display=menu.style.display==='none'?'block':'none';
    // Reuse existing pinch selection: only consume a pinch when it lands on our added controls.
    // Otherwise pass it unchanged to the original gesture handler.
    if(typeof pinchSelect==='function'){
      const original=pinchSelect;
      pinchSelect=function(x,y){
        if(!document.querySelector('#handCursor.on'))return original(x,y);
        const hit=[launch,...menu.querySelectorAll('button')].find(b=>{
          if(b!==launch&&menu.style.display==='none')return false;
          const r=b.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
        });
        if(hit){hit.click();return;}
        return original(x,y);
      };
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();