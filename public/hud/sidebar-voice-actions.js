/* S.C.O.T.T.Y. sidebar + voice actions, additive to existing HUD */
(function(){
 function boot(){
  const left=document.querySelector('aside.left'),main=document.querySelector('main.main'),right=document.querySelector('aside.right');
  if(!left||!main||!right||document.getElementById('scottySidebarControls'))return;
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const panel=document.createElement('div');panel.id='scottySidebarControls';
  const groups=[['Workspaces', [...main.querySelectorAll('.toolbar button, .toolbar .chip')].filter(x=>x.tagName==='BUTTON'),
    ...[...document.querySelectorAll('button')].filter(b=>b.closest('main.main')&&b.closest('.toolbar')===null&&b!==document.getElementById('mic')&&b!==document.getElementById('send')&&b.id!=='eyesHandMenu'&&b.id!=='confirmEyes'&&b.id!=='eyes')],
   ['Canvas actions',[...right.querySelectorAll('button')]],
   ['Hand commands',[]]];
  const moved=new Set();
  for(const [heading,items] of groups){
    if(!items.length)continue;
    const section=document.createElement('section');section.className='scotty-side-section';
    const title=document.createElement('div');title.className='title';title.textContent=heading;section.appendChild(title);
    for(const b of items){
      if(moved.has(b)||b.closest('#eyesHandPalette')||b.closest('#nodeDrawer')||b.closest('#confirm')||b.closest('#voiceSettingsPanel'))continue;
      moved.add(b);b.classList.add('scotty-side-action');section.appendChild(b);
    }
    if(section.querySelector('button'))panel.appendChild(section);
  }
  const privacy=left.querySelector('.privacy');
  if(privacy)left.insertBefore(panel,privacy);else left.appendChild(panel);
  const css=document.createElement('style');css.textContent=`
    aside.left{overflow-y:auto!important;overscroll-behavior:contain}
    #scottySidebarControls{padding:10px 0 16px}
    #scottySidebarControls .scotty-side-section{border-top:1px solid rgba(94,234,255,.15);padding:9px 0}
    #scottySidebarControls .title{margin:0 0 7px!important}
    #scottySidebarControls button.scotty-side-action{display:block!important;position:static!important;transform:none!important;float:none!important;width:100%!important;max-width:100%!important;margin:4px 0!important;padding:8px 7px!important;font-size:10px!important;white-space:normal!important;text-align:left!important;min-height:31px;opacity:1}
    #scottySidebarControls button.scotty-side-action[disabled]{opacity:.45}
    #eyesHandMenu,#eyesHandPalette{display:none!important}
    main.main .toolbar{display:none!important}
    aside.right .stat,aside.right .title,aside.right .activity,aside.right .feed{display:initial}
  `;document.head.appendChild(css);
  // The original buttons and their event listeners are moved, not cloned.
  // Preserve all existing confirmation dialogs and action permissions.
  const prior=window.SCOTTYVoiceNavigation?.execute?.bind(window.SCOTTYVoiceNavigation);
  const aliases={
   'show my agents':'agent matrix','show all agents':'128 agents','all agents':'128 agents',
   'what is everyone working on':'live ops','what are my agents doing':'live ops',
   'open my memory':'memory map','open your memory':'memory map',
   'open my daily dashboard':'daily life','find my projects':'files and projects',
   'organize my canvas':'spatial tools','undo that':'undo canvas change',
   'clear my selection':'clear selection','spread the agents out':'spread out',
   'group the agents':'regroup','call those agents':'call selected',
   'select multiple agents':'multi select','run recovery test':'run safe recovery test',
   'stop everything':'stop','pause':'stop','open my brain':'brain',
   'open my projects':'projects','open my integrations':'integrations',
   'show agent activity':'live ops','show my knowledge':'knowledge'
  };
  const candidates=()=>[...document.querySelectorAll('button')].filter(b=>!b.closest('#eyesHandPalette')&&!b.closest('#confirm')&&!b.closest('#nodeDrawer')&&b.id!=='mic'&&b.id!=='send'&&b.id!=='eyes');
  const execute=(input)=>{
    const original=norm(input);
    let q=original.replace(/^(hey )?(scotty|scottie|scoty) /,'').replace(/^(please |can you |could you |would you )/,'');
    q=aliases[q]||q;
    q=q.replace(/^(please |open |show |display |go to |take me to |switch to |activate |enable |turn on |select |press |click |run |start )/,'');
    q=aliases[q]||q;
    if(q==='box select')q='box select off';
    if(q==='group move')q='group move off';
    if(q==='multi select')q='multi select off';
    const button=candidates().find(b=>norm(b.textContent)===q)||
      candidates().find(b=>norm(b.textContent).startsWith(q+' '))||
      candidates().find(b=>norm(b.textContent).replace(/\b(on|off)\b/g,'').trim()===q);
    if(button){
      if(button.disabled){document.querySelector('#cs')&&(document.querySelector('#cs').textContent='ACTION UNAVAILABLE');return true}
      button.click();return true;
    }
    return prior?prior(input):false;
  };
  window.SCOTTYVoiceNavigation={execute,available:()=>candidates().map(b=>norm(b.textContent)).filter(Boolean)};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();