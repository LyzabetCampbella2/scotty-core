/* Voice-first navigation: preserves original button handlers, hand tracking and HUD canvas. */
(function(){
 const ready=()=>{
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const routes=[
   ['agent matrix', ['agent matrix']],['live ops',['live ops']],['memory map',['memory map']],
   ['all agents',['128 agents','agents']],['conversation',['conversation']],['daily life',['daily life']],
   ['knowledge',['knowledge']],['voice settings',['voice controls','voice']],
   ['search nodes',['search nodes']],['actions',['actions']],['creative and learning',['creative learning']],
   ['files and projects',['files projects']],['spatial tools',['spatial tools']],
   ['command room',['command room']],['voice workspace',['voice workspace']],['connectors',['connectors']],
   ['multi select',['multi select']],['clear selection',['clear selection']],
   ['undo canvas change',['undo canvas change']],['reset node layout',['reset node layout']],
   ['call selected',['call selected']],['spread out',['spread out']],['regroup',['regroup']],
   ['box select',['box select']],['group move',['group move']]
  ];
  const aliases={'show my agents':'agent matrix','show agents':'agent matrix','show all agents':'all agents',
    'show me my agents':'agent matrix','what is everyone working on':'live ops',
    'open my memory':'memory map','open memory':'memory map','open my daily dashboard':'daily life',
    'find my projects':'files and projects','open projects':'files and projects',
    'organize canvas':'spatial tools','undo that':'undo canvas change',
    'clear my selection':'clear selection','spread the agents out':'spread out',
    'group the agents':'regroup','call those agents':'call selected'};
  const findButton=(label)=>{
   const buttons=[...document.querySelectorAll('button')].filter(b=>!b.closest('#eyesHandPalette'));
   return buttons.find(b=>norm(b.textContent)===norm(label))||
     buttons.find(b=>norm(b.textContent).startsWith(norm(label)+' '));
  };
  window.SCOTTYVoiceNavigation={execute(input){
    let q=norm(input).replace(/^(?:hey )?(?:scotty|scottie|scoty) /,'')
      .replace(/^(?:please |can you |could you |would you )/,'')
      .replace(/^(?:open|show|display|go to|take me to|switch to|activate|enable|turn on|select|press|click) /,'');
    q=aliases[q]||q;
    const entry=routes.find(([name])=>q===name);
    if(!entry)return false;
    const target=entry[1].map(findButton).find(Boolean);
    if(!target||target.disabled){document.querySelector('#cs')&&(document.querySelector('#cs').textContent='VOICE CONTROL UNAVAILABLE • '+entry[0].toUpperCase());return true}
    target.click();return true;
  }};
  // Wrap the existing command pipeline, preserving mission, approvals and conversational fallthrough.
  if(typeof command==='function'){
   const prior=command;
   command=async function(t){if(window.SCOTTYVoiceNavigation.execute(String(t||'')))return;return prior(t)};
  }
  // Remove visual navigation clutter only; keep buttons in DOM for existing hand/touch handlers.
  const style=document.createElement('style');
  style.textContent='.toolbar>.mode,.toolbar>.chip,#eyesHandMenu,#eyesHandPalette{display:none!important}';
  document.head.appendChild(style);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();