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
 const privacy=left.querySelector('.privacy');left.insertBefore(holder,privacy||null);
 const style=document.createElement('style');style.textContent=`
 aside.left{overflow-y:auto!important;overscroll-behavior:contain}
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