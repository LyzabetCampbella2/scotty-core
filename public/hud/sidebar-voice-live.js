/* Voice and sidebar extension. Original buttons and Eyes On handlers are preserved. */
(function(){
function init(){
 const left=document.querySelector('aside.left'),main=document.querySelector('main.main'),right=document.querySelector('aside.right');
 if(!left||!main||!right||document.querySelector('#scottyActionSidebar'))return;
 const holder=document.createElement('section');holder.id='scottyActionSidebar';
 const title=document.createElement('div');title.className='title';title.textContent='Voice + Hand Actions';holder.append(title);
 const move=(button)=>{if(!button)return;button.classList.add('scotty-sidebar-action');holder.append(button)};
 // Move the actual nodes, not clones: existing listeners, IDs, and handlers survive.
 [...main.querySelectorAll('.toolbar button')].forEach(move);
 ['eyesMultiSelect','eyesClearSelection','eyesUndoMove','eyesResetLayout'].forEach(id=>move(document.getElementById(id)));
 move(right.querySelector('[data-scotty-recovery-test]'));
 // Also move toolbar controls injected after initial load by other HUD modules.
 const relocate=()=>{
  const toolbar=main.querySelector('.toolbar');
  if(toolbar)[...toolbar.querySelectorAll('button')].forEach(move);
  const actionLabels=/^(?:call selected|spread out|regroup|box select|group move|clear selection|undo canvas change|reset node layout|multi.select)/i;
  [...right.querySelectorAll('button')].filter(b=>actionLabels.test(b.textContent.trim())).forEach(move);
 };
 relocate();
 let pending=false;
 const watcher=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;relocate()})});
 watcher.observe(main,{childList:true,subtree:true});
 watcher.observe(right,{childList:true,subtree:true});
 const calls=document.createElement('section');calls.id='scottyPrivateCalls';calls.innerHTML='<div class="title">Private Calls</div><button type="button" id="scottyCallMe">CALL S.C.O.T.T.Y.</button><button type="button" id="scottyEndCall" disabled>END CALL</button><div id="scottyCallStatus" role="status" aria-live="polite">Ready · Owner initiated only</div><div class="scotty-call-note">Telephone dialing is not connected. S.C.O.T.T.Y. cannot place calls without your approval.</div>';left.insertBefore(calls,holder);
 const start=calls.querySelector('#scottyCallMe'),end=calls.querySelector('#scottyEndCall'),status=calls.querySelector('#scottyCallStatus');
 const setCall=(active,msg)=>{start.disabled=active;end.disabled=!active;status.textContent=msg};
 start.addEventListener('click',()=>{const mic=document.getElementById('mic');if(!mic){setCall(false,'Voice microphone unavailable');return}if(!mic.classList.contains('listening'))mic.click();setCall(true,'In-app voice requested · use END CALL to stop')});
 end.addEventListener('click',()=>{const mic=document.getElementById('mic');if(mic&&mic.classList.contains('listening'))mic.click();setCall(false,'Call ended · Ready')});
 const privacy=left.querySelector('.privacy');left.insertBefore(holder,privacy||null);
 const style=document.createElement('style');style.textContent=`
 aside.left{overflow-y:auto!important;overscroll-behavior:contain}\n #scottyPrivateCalls{border-top:1px solid rgba(94,234,255,.2);padding:9px 0} #scottyPrivateCalls button{width:100%;background:rgba(94,234,255,.08);border:1px solid rgba(94,234,255,.3);border-radius:7px;color:#ddf8ff;padding:9px;margin:3px 0;font-size:10px} #scottyPrivateCalls button:disabled{opacity:.45} #scottyCallStatus,.scotty-call-note{font-size:9px;color:#8da8ba;line-height:1.4;margin:5px 0}
 #scottyActionSidebar{border-top:1px solid rgba(94,234,255,.2);padding:10px 0 14px}
 #scottyActionSidebar>.title{margin-bottom:8px}
 #scottyActionSidebar .scotty-sidebar-action{display:block!important;position:static!important;width:100%!important;max-width:100%!important;min-height:32px!important;margin:4px 0!important;padding:7px 8px!important;white-space:normal!important;text-align:left!important;transform:none!important;font-size:10px!important;float:none!important}
 .main .toolbar{display:none!important}
 `;document.head.append(style);
 const normalize=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const aliases={'show my agents':'agent matrix','show me my agents':'agent matrix','show all agents':'128 agents','show all 128 agents':'128 agents',
 'what is everyone working on':'live ops','show live operations':'live ops','open my memory':'memory map','open your memory map':'memory map',
 'open my daily dashboard':'daily life','open my projects':'projects','open my integrations':'integrations',
 'spread the agents out':'spread out','spread the nodes out':'spread out','undo that':'undo node move',
 'clear my selection':'clear selection','reset the layout':'reset node layout','call those agents':'call selected',
 'run a safe recovery test':'run safe recovery test','stop what you are doing':'stop','show my brain':'brain'};
 const targets=()=>[...document.querySelectorAll('button')].filter(b=>!b.closest('#confirm')&&!b.closest('#gate')&&!b.closest('#nodeDrawer')&&!b.closest('#eyesHandPalette')&&!b.disabled&&b.id!=='mic'&&b.id!=='send'&&b.id!=='eyes');
 const action=(raw)=>{
  let q=normalize(raw).replace(/^(hey )?(scotty|scottie|scoty) /,'').replace(/^(please |can you |could you |would you )/,'');
  q=aliases[q]||q;
  q=q.replace(/^(please |open |show |display |go to |take me to |switch to |activate |enable |turn on |select |press |click |run |start )/,'');
  q=aliases[q]||q;
  if(q==='stop'){const stop=targets().find(b=>normalize(b.textContent)==='stop');if(stop){stop.click();return true}return false}
  const btn=targets().find(b=>normalize(b.textContent)===q)||targets().find(b=>normalize(b.textContent).replace(/\b(on|off)\b/g,'').trim()===q)||targets().find(b=>normalize(b.textContent).startsWith(q+' '));
  if(!btn)return false;
  btn.click();return true;
 };
 window.SCOTTYVoiceNavigation={execute:action,available:()=>targets().map(b=>normalize(b.textContent)).filter(Boolean)};
 // Intercept at command entry; unrecognized conversation and missions retain original behavior.
 if(typeof command==='function'){const previous=command;command=async function(t){if(action(t||document.querySelector('#ci')?.value)){const input=document.querySelector('#ci');if(input)input.value='';return}return previous(t)}}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();