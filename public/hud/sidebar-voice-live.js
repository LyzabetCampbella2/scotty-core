/* Voice and sidebar extension. Original buttons and Eyes On handlers are preserved. */
(function(){
function init(){
 const left=document.querySelector('aside.left'),main=document.querySelector('main.main'),right=document.querySelector('aside.right');
 if(!left||!main||!right||document.querySelector('#scottyActionSidebar'))return;
 const holder=document.createElement('section');holder.id='scottyActionSidebar';
 const title=document.createElement('div');title.className='title';title.textContent='Voice + Hand Actions';holder.append(title);
 // Attach the destination before moving controls or inserting its sibling.
 const privacy=left.querySelector('.privacy');left.insertBefore(holder,privacy||null);
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
 const calls=document.createElement('section');calls.id='scottyPrivateCalls';calls.innerHTML='<div class="title">Private Calls</div><button type="button" id="scottyCallMe">CALL S.C.O.T.T.Y.</button><button type="button" id="scottyEndCall" disabled>END CALL</button><input id="scottyContactName" aria-label="Contact name" placeholder="Contact name" autocomplete="off"><input id="scottyContactPhone" aria-label="Phone number" placeholder="Phone number to save" type="tel"><button type="button" id="scottySaveContact">SAVE CONTACT</button><button type="button" id="scottyCallContact">CALL BY NAME</button><div id="scottyContactConfirm" hidden><div id="scottyContactPreview"></div><button type="button" id="scottyApproveContact">CONFIRM REQUEST</button><button type="button" id="scottyCancelContact">CANCEL</button></div><div id="scottyCallStatus" role="status" aria-live="polite">Ready · Owner initiated only</div><div class="scotty-call-note">Telephone dialing is not connected. S.C.O.T.T.Y. cannot place calls without your approval.</div>';left.insertBefore(calls,holder);
 const start=calls.querySelector('#scottyCallMe'),end=calls.querySelector('#scottyEndCall'),status=calls.querySelector('#scottyCallStatus');
 const setCall=(active,msg)=>{start.disabled=active;end.disabled=!active;status.textContent=msg};
 start.addEventListener('click',()=>{if(window.SCOTTYCalls){window.SCOTTYCalls.start().catch(e=>status.textContent=e.message);return}const mic=document.getElementById('mic');if(!mic){setCall(false,'Voice microphone unavailable');return}if(!mic.classList.contains('listening'))mic.click();setCall(true,'In-app voice requested · use END CALL to stop')});
 end.addEventListener('click',()=>{if(window.SCOTTYCalls){window.SCOTTYCalls.end();return}const mic=document.getElementById('mic');if(mic&&mic.classList.contains('listening'))mic.click();setCall(false,'Call ended · Ready')});
 const nameInput=calls.querySelector('#scottyContactName'),phoneInput=calls.querySelector('#scottyContactPhone'),confirmBox=calls.querySelector('#scottyContactConfirm'),preview=calls.querySelector('#scottyContactPreview');
 const key='scotty_owner_phone_contacts_v1';
 const speechHint=document.createElement('div');speechHint.className='scotty-call-note';speechHint.textContent='Voice: “Scotty, call Mom”, “save contact Mom at 555 123 4567”, “confirm call”, “cancel call”, “call Scotty”, or “end call”.';calls.append(speechHint);
 const getContacts=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}};
 const cleanName=s=>String(s||'').trim().replace(/\s+/g,' ').slice(0,80);
 const lookup=()=>{const name=cleanName(nameInput.value);return {name,number:getContacts()[name.toLowerCase()]}};
 calls.querySelector('#scottySaveContact').addEventListener('click',()=>{const name=cleanName(nameInput.value),number=phoneInput.value.trim();if(!name||!/^\+?[0-9(). -]{7,24}$/.test(number)){status.textContent='Enter a contact name and valid phone number';return}const contacts=getContacts();contacts[name.toLowerCase()]=number;try{localStorage.setItem(key,JSON.stringify(contacts));status.textContent='Saved '+name+' on this device'}catch{status.textContent='Unable to save contact on this device'}});
 const requestContact=spoken=>{if(spoken)nameInput.value=spoken;const found=lookup();if(!found.name||!found.number){status.textContent='Contact not found. Add a name and number first.';return false}preview.textContent='Request call to '+found.name+' ('+found.number+')?';confirmBox.hidden=false;status.textContent='Waiting for your confirmation';return true};
 calls.querySelector('#scottyCallContact').addEventListener('click',()=>requestContact());
 calls.querySelector('#scottyCancelContact').addEventListener('click',()=>{confirmBox.hidden=true;status.textContent='Call request cancelled'});
 calls.querySelector('#scottyApproveContact').addEventListener('click',()=>{const found=lookup();confirmBox.hidden=true;status.textContent='Approved '+found.name+' ('+found.number+'). Telephone provider not connected; no call placed.'});
 window.SCOTTYContactCalls={request:requestContact};
 const style=document.createElement('style');style.textContent=`
 aside.left{overflow-y:auto!important;overscroll-behavior:contain}\n #scottyPrivateCalls{border-top:1px solid rgba(94,234,255,.2);padding:9px 0} #scottyPrivateCalls button{width:100%;background:rgba(94,234,255,.08);border:1px solid rgba(94,234,255,.3);border-radius:7px;color:#ddf8ff;padding:9px;margin:3px 0;font-size:10px} #scottyPrivateCalls button:disabled{opacity:.45} #scottyCallStatus,.scotty-call-note{font-size:9px;color:#8da8ba;line-height:1.4;margin:5px 0}
 #scottyPrivateCalls input,#scottyPrivateCalls button:not(#scottyEndCall){display:none!important} #scottyPrivateCalls #scottyContactConfirm button{display:none!important} #scottyPrivateCalls #scottyCallStatus{display:block!important} #scottyPrivateCalls input{width:100%;box-sizing:border-box;background:#020a13;border:1px solid rgba(94,234,255,.25);border-radius:6px;color:white;padding:8px;margin:3px 0;font-size:11px} #scottyContactConfirm{border:1px solid rgba(94,234,255,.35);border-radius:7px;padding:7px;font-size:10px} #scottyContactConfirm[hidden]{display:none!important}\n #scottyActionSidebar{border-top:1px solid rgba(94,234,255,.2);padding:10px 0 14px}
 #scottyActionSidebar>.title{margin-bottom:8px}
 #scottyActionSidebar .scotty-sidebar-action{display:block!important;position:static!important;width:100%!important;max-width:100%!important;min-height:32px!important;margin:4px 0!important;padding:7px 8px!important;white-space:normal!important;text-align:left!important;transform:none!important;font-size:10px!important;float:none!important}
 .main .toolbar{display:none!important}
 @media(max-width:900px){.hud{grid-template-columns:150px minmax(0,1fr)}aside.left>.title,#scottyActionSidebar>.title,#scottyPrivateCalls>.title{display:block!important}aside.left .nav span{display:inline!important}aside.left .nav{text-align:left;padding:9px 6px}}
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
  if(window.SCOTTYWorkspaceVoice?.execute(raw))return true;
  if(window.SCOTTYCalls?.execute(raw))return true;
  const utterance=String(raw||'').trim().replace(/^(?:(?:hey\s+)?scotty[,\s]+)?(?:please\s+)?/i,'').trim();
  if(/^(?:call scotty|start (?:private )?call|talk to scotty)$/i.test(utterance)){start.click();return true}
  if(/^(?:end (?:the )?call|hang up|stop (?:private )?call)$/i.test(utterance)){end.click();return true}
  const save=utterance.match(/^(?:save|add|remember)\s+(?:contact\s+)?(.+?)\s+(?:at|number|phone number|as)\s+(\+?[0-9(). -]{7,24})$/i);
  if(save){nameInput.value=save[1].trim();phoneInput.value=save[2].trim();calls.querySelector('#scottySaveContact').click();return true}
  if(/^(?:confirm|approve|yes call|confirm call)$/i.test(utterance)&&!confirmBox.hidden){calls.querySelector('#scottyApproveContact').click();return true}
  if(/^(?:cancel|cancel call|don't call|do not call)$/i.test(utterance)&&!confirmBox.hidden){calls.querySelector('#scottyCancelContact').click();return true}
  const contactMatch=String(raw||'').trim().match(/^(?:(?:hey\s+)?scotty[,\s]+)?(?:please\s+)?call\s+(?:contact\s+)?(.+?)\s*$/i);
  if(contactMatch&&window.SCOTTYContactCalls?.request(contactMatch[1]))return true;
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
/* S.C.O.T.T.Y. conversational workspace features 21–30; no external actions without existing approvals. */
(function(){
const KEY='scotty_voice_workspace_21_30';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const state=Object.assign({aliases:{},lastItem:'',lastProject:'',checkpoint:null,goal:'',questions:[],pending:null,history:[]},read());
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
const say=(message)=>{const panel=document.getElementById('scottyVoiceWorkspaceStatus');if(panel)panel.textContent=message;window.dispatchEvent(new CustomEvent('scotty:workspace-response',{detail:{text:message}}));return true};
const norm=s=>String(s||'').trim().toLowerCase().replace(/\\s+/g,' ');
const clean=s=>String(s||'').trim().slice(0,240);
const buttons=()=>[...document.querySelectorAll('button')].filter(b=>!b.disabled&&b.offsetParent!==null&&!b.closest('#gate')&&!b.closest('#confirm')&&!b.closest('#scottyPrivateCalls'));
const findButton=phrase=>buttons().find(b=>norm(b.textContent)===norm(phrase))||buttons().find(b=>norm(b.textContent).includes(norm(phrase)));
const focus=()=>{const el=document.activeElement;const selection=document.querySelector('[aria-selected="true"],.selected,[data-selected="true"]');return clean(selection?.getAttribute('aria-label')||selection?.getAttribute('data-node-id')||selection?.textContent||el?.getAttribute('aria-label')||state.lastItem)};
const queue=(description,fn)=>{state.pending={description:clean(description),createdAt:Date.now()};save();window.SCOTTYWorkspaceVoice.pendingFn=fn||null;return say('Prepared: '+description+'. Say read the request back to me, confirm workspace action, or cancel workspace action.')};
const execute=(input)=>{
 const raw=clean(input).replace(/^(?:hey\\s+)?scotty[,\\s]*/i,'').replace(/^please\\s+/i,'');const q=norm(raw);if(!q)return false;
 if(/^(what can i do here|what commands can i use|help with this screen|show voice commands)$/.test(q)){const names=buttons().map(b=>clean(b.textContent)).filter(Boolean).slice(0,12);return say('On this screen, available actions include: '+(names.join(', ')||'workspace navigation')+'. You can also say writing time, mark where we left off, read the request back to me, or stay with me while I outline this chapter.')}
 let m=raw.match(/^when i say ['“"]?(.+?)['”"]?,?\\s*(?:then\\s+)?(.+)$/i);if(m){const phrase=norm(m[1]),target=clean(m[2]);if(!phrase||phrase.length>80)return say('Choose a shorter custom phrase.');state.aliases[phrase]=target;save();return say('Saved custom phrase '+phrase+' for '+target+'.')}
 if(state.aliases[q])return execute(state.aliases[q]);
 if(/^(open that one|select that one|open it)$/.test(q)){const item=focus();if(!item)return say('Select a node or item first, then ask me to open it.');return queue('Open selected item '+item,()=>{const b=findButton(item);if(b)b.click();else say('The selected item does not expose a safe open action yet.')})}
 m=raw.match(/^(?:move (?:it|that|this)(?: to| into)|move selected(?: item)? to)\\s+(.+)$/i);if(m){const item=focus();if(!item)return say('Select the item you want to move first.');state.lastProject=clean(m[1]);save();return queue('Move '+item+' to '+state.lastProject+' (preview only; no file move connector)',()=>say('Move reviewed. A file or node move connector is still required.'))}
 m=raw.match(/^actually,?\\s*(?:use|open|choose)\\s+(.+)$/i);if(m){state.lastProject=clean(m[1]);if(state.pending)state.pending.description=state.pending.description.replace(/(?:to|in|into) [^,]+$/i,'to '+state.lastProject);save();return say('Correction noted: '+state.lastProject+'. '+(state.pending?'Pending request is now: '+state.pending.description:'No action has been executed.'))}
 if(/^(read (?:the|my) request back to me|read it back|what are you about to do)$/.test(q))return say(state.pending?'Proposed action: '+state.pending.description+'. Nothing has run yet.':'There is no pending workspace action.');
 if(/^(cancel workspace action|discard that request|cancel that action)$/.test(q)){state.pending=null;window.SCOTTYWorkspaceVoice.pendingFn=null;save();return say('Pending workspace action cancelled.')}
 if(/^(confirm workspace action|approve workspace action)$/.test(q)){if(!state.pending)return say('There is no pending workspace action.');const description=state.pending.description,fn=window.SCOTTYWorkspaceVoice.pendingFn;state.pending=null;window.SCOTTYWorkspaceVoice.pendingFn=null;save();if(fn)fn();return say('Confirmed workspace request: '+description+'. Only supported local actions were attempted.')}
 if(/^(undo (?:the )?(?:last )?(?:node move|canvas change|layout change)|undo that)$/.test(q)){const b=findButton('undo canvas change')||findButton('undo node move');if(!b)return say('No supported node undo control is available on this screen.');b.click();return say('Requested undo through the existing canvas undo control.')}
 if(/^(mark where we left off|save my place|checkpoint this session)$/.test(q)){state.checkpoint={item:focus(),project:state.lastProject,goal:state.goal,time:new Date().toISOString()};save();return say('Checkpoint saved on this device. Current item: '+(state.checkpoint.item||'none selected')+'. Goal: '+(state.goal||'not specified')+'.')}
 if(/^(where did we leave off|resume my checkpoint|resume writing session)$/.test(q)){const cp=state.checkpoint;return say(cp?'Last checkpoint: '+(cp.item||'no item')+'. Goal: '+(cp.goal||'not specified')+'. Saved '+new Date(cp.time).toLocaleString()+'.':'No checkpoint has been saved yet.')}
 m=raw.match(/^(?:stay with me while i|help me)\\s+(?:outline|write|revise)\\s+(.+)$/i);if(m){state.goal='Work on '+clean(m[1]);save();return say('Writing session goal saved: '+state.goal+'. Tell me an unanswered question or say mark where we left off.')}
 m=raw.match(/^(?:remember (?:this )?question|unanswered question)[:\\s]+(.+)$/i);if(m){state.questions.push(clean(m[1]));state.questions=state.questions.slice(-30);save();return say('Saved unanswered question: '+clean(m[1]));}
 if(/^(what questions are left|list unanswered questions)$/.test(q))return say(state.questions.length?'Unanswered questions: '+state.questions.join('; '):'No unanswered questions saved yet.');
 m=raw.match(/^find (?:the )?paragraph about (.+?)(?: and show a rewrite)?$/i);if(m)return say('Document editing is in review mode. Search requested for '+clean(m[1])+'. Open the document and select the passage first; I will not overwrite text without a reviewable editor connection.');
 if(/^(?:find my chapter,? open it,? and prepare revision notes|prepare revision notes for my chapter)$/.test(q))return queue('Find the current chapter, open it, then prepare revision notes for review (no document edits)',()=>say('Revision-note workflow approved for review; document search and editing need a connected document workspace.'));
 return false;
};
window.SCOTTYWorkspaceVoice={execute,pendingFn:null,state};
const install=()=>{const left=document.querySelector('aside.left');if(!left||document.getElementById('scottyVoiceWorkspaceStatus'))return;const panel=document.createElement('div');panel.id='scottyVoiceWorkspaceStatus';panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');panel.style.cssText='font-size:10px;line-height:1.5;color:#8da8ba;padding:9px;border:1px solid rgba(94,234,255,.2);border-radius:7px;white-space:pre-wrap';panel.textContent='Voice workspace ready · Ask “Scotty, what can I do here?”';left.append(panel)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();