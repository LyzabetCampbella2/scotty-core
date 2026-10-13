(function(){
 if(window.SCOTTYCallExtras)return;
 const core=window.SCOTTYCallContactsCore,$=s=>document.querySelector(s),storageKey='scotty_call_contacts_v2';
 let contacts=[],pending=null,selected=null,favoritesOnly=false,captionOn=true,captionRows=[];
 const section=document.createElement('section');section.id='callContacts';section.innerHTML=`
 <hr><h3>CONTACTS & CALL PREPARATION</h3>
 <small>Saved only in this browser profile, not synchronized or encrypted. Nicknames match exactly. Shared nicknames require you to choose a person. Telephone dialing is not connected.</small>
 <div><button id="ccAll">ALL CONTACTS</button><button id="ccFavorites">FAVORITES</button><button id="ccNew">NEW CONTACT</button></div>
 <div id="ccList"></div>
 <label>Name <input id="ccName" maxlength="80" autocomplete="off"></label>
 <label>Nicknames (comma separated) <input id="ccAliases" maxlength="960" autocomplete="off"></label>
 <label>Phone (optional for Jitsi) <input id="ccPhone" type="tel" maxlength="24" autocomplete="off"></label>
 <label>Preferred method <select id="ccMethod"><option value="jitsi">Jitsi internet room</option><option value="telephone">Telephone — not connected</option></select></label>
 <label><input id="ccFavorite" type="checkbox"> Favorite</label>
 <button id="ccSave">SAVE CONTACT</button><button id="ccRequest">REVIEW CALL REQUEST</button>
 <div id="ccConfirm" hidden><p id="ccPreview"></p><button id="ccApprove">CONFIRM EXACT RECIPIENT</button><button id="ccCancel">CANCEL REQUEST</button></div>
 <p id="ccStatus" role="status"></p>
 <button id="ccLobby">ENABLE JITSI LOBBY</button><small>After joining as host, request the Jitsi lobby and verify it in the room. An unlisted link alone does not restrict admission; host permissions are required.</small>
 <h4>CALL BRIEF</h4><div id="ccBriefPerson">Choose a contact or say “Prepare call with Mom”.</div>
 <label>Goal <input id="ccGoal" maxlength="1000"></label><label>Notes / questions <textarea id="ccNotes" maxlength="4000"></textarea></label>
 <small>Briefs stay in this page only and are not sent to contacts or used as automatic instructions. Voice: “Set call goal to …” or “Set call notes to …”.</small>
 <h4>SCOTTY CAPTIONS</h4><button id="ccCaptions">HIDE CAPTIONS</button><div id="ccCaptionText" role="log" aria-live="polite" aria-label="Scotty call captions"></div>
 <small>Captions show recognized utterances after Whisper finishes and Scotty’s response text. They are not word-by-word audio alignment and do not caption Jitsi participants. No transcript is saved by this feature.</small>
 <small>Voice: “Save internet contact Alex”, “Nickname Alex as boss”, “Use Jitsi for Alex”, “Favorite Alex”, “Call boss”, then “Confirm call”.</small>`;
 $('#callsPanel').append(section);$('#callText').hidden=true;
 const style=document.createElement('style');style.textContent='#callContacts label{display:block;margin:8px 0}#callContacts input:not([type=checkbox]),#callContacts textarea{display:block;box-sizing:border-box;width:100%;padding:9px;background:#061824;color:#d8edf6;border:1px solid #366275;border-radius:6px}#ccConfirm{border:1px solid #ffd166;padding:12px}#ccCaptionText{white-space:pre-wrap;max-height:220px;overflow:auto;padding:10px;border-left:2px solid #5eeaff}#ccList{max-height:180px;overflow:auto}#ccList button{display:block;text-align:left}';document.head.append(style);
 const status=text=>{$('#ccStatus').textContent=text;};
 function read(){try{const raw=localStorage.getItem(storageKey);if(raw){const parsed=JSON.parse(raw);if(!Array.isArray(parsed))throw Error();contacts=parsed.slice(0,500).map(c=>core.validate({...c,aliases:Array.isArray(c.aliases)?c.aliases.join(','):c.aliases}));}
  else{const legacy=JSON.parse(localStorage.getItem('scotty_owner_phone_contacts_v1')||'{}');contacts=Object.entries(legacy).slice(0,500).map(([name,phone])=>core.validate({id:crypto.randomUUID(),name,phone,method:'telephone'}));if(contacts.length){localStorage.setItem(storageKey,JSON.stringify(contacts));status('Earlier contacts copied into this device’s contact list.');}}}
  catch{contacts=[];status('Contact storage could not be read. Existing stored data was not overwritten. Reload before saving.');return false;}return true;}
 const readable=read();
 function write(next){if(!readable)throw Error('Contact storage needs attention; reload before saving.');if(next.length>500)throw Error('Contact limit reached.');localStorage.setItem(storageKey,JSON.stringify(next));contacts=next;cancel(false);render();}
 function render(){const list=$('#ccList');list.replaceChildren();for(const c of contacts.filter(c=>!favoritesOnly||c.favorite)){const b=document.createElement('button');b.textContent=(c.favorite?'★ ':'')+c.name+' • '+(c.method==='jitsi'?'Jitsi':'telephone');b.onclick=()=>edit(c);list.append(b);}if(!list.children.length)list.textContent=favoritesOnly?'No favorites yet.':'No contacts yet.';}
 function show(){window.SCOTTYCalls.show();section.scrollIntoView?.({block:'start'});}
 function edit(c){selected=c?.id||null;$('#ccName').value=c?.name||'';$('#ccAliases').value=c?.aliases.join(', ')||'';$('#ccPhone').value=c?.phone||'';$('#ccMethod').value=c?.method||'jitsi';$('#ccFavorite').checked=!!c?.favorite;cancel(false);show();}
 function save(c){const value=core.validate(c);value.id=value.id||crypto.randomUUID();if(contacts.some(x=>x.id!==value.id&&core.key(x.name)===core.key(value.name)))throw Error('That exact contact name already exists. Choose the existing contact to edit it.');const next=contacts.filter(x=>x.id!==value.id);next.push(value);write(next);edit(value);status('Saved '+value.name+' on this device.');return value;}
 function exact(name){const matches=core.resolve(contacts,name);if(matches.length!==1){cancel(false);show();status(matches.length?'More than one contact matches. Choose the exact person below.':'Contact not found. Save the contact first.');if(matches.length){const list=$('#ccList');list.replaceChildren();for(const c of matches){const b=document.createElement('button');b.textContent=c.name+' • '+c.method+' • '+(c.phone||'no telephone number');b.onclick=()=>requestId(c.id);list.append(b);}}return null;}return matches[0];}
 function cancel(message=true){pending=null;$('#ccConfirm').hidden=true;if(message)status('Call request cancelled. No call placed.');}
 function requestId(id){cancel(false);const c=contacts.find(x=>x.id===id);show();if(!c){status('Choose a saved contact first.');return true;}pending={id:c.id,snapshot:core.snapshot(c),created:Date.now(),room:c.method==='jitsi'?'Scotty-'+crypto.randomUUID().replaceAll('-',''):null};$('#ccPreview').textContent='Confirm '+c.name+(c.aliases.length?' (nicknames: '+c.aliases.join(', ')+')':'')+' • '+(c.method==='jitsi'?'Jitsi internet room':'telephone '+c.phone)+'. '+(c.method==='jitsi'?'A new unlisted room will open. Anyone with its link can attempt to join; use Jitsi lobby controls. No invitation is sent.':'Telephone provider is not connected; confirming cannot place a call.');$('#ccConfirm').hidden=false;status('Waiting for exact-recipient confirmation (expires in two minutes).');return true;}
 function request(name){const c=exact(name);if(c)requestId(c.id);return true;}
 async function approve(){const c=core.approval(pending,contacts);if(!c){cancel(false);status('Request expired or contact changed. Review the recipient again.');return;}if(window.SCOTTYCalls.mode!=='idle'){status('End the active call before confirming this request.');return;}const chosenRoom=pending.room;cancel(false);if(c.method==='telephone'){status('Confirmed '+c.name+' ('+c.phone+'). Telephone provider not connected; no call placed.');return;}status('Opening room for '+c.name+'. Share the room link yourself; no invitation was sent.');await window.SCOTTYCalls.startRoom(chosenRoom);}
 function prepare(c){show();$('#ccBriefPerson').textContent='Preparing for '+c.name+' • '+(c.method==='jitsi'?'Jitsi internet room':'telephone '+c.phone)+' • '+(c.method==='jitsi'?'Have headphones ready; confirm recipient before opening a room.':'Dialing is not connected.');}
 function caption(who,text){if(window.SCOTTYCalls.mode!=='scotty')return;window.SCOTTYCallSession?.note(who==='YOU'?'user':'assistant',text);captionRows.push(who+': '+String(text||''));captionRows=captionRows.slice(-12);$('#ccCaptionText').textContent=captionRows.join('\n\n').slice(-12000);}
 function toggleCaption(value){captionOn=value;$('#ccCaptionText').hidden=!value;$('#ccCaptionText').setAttribute('aria-live',value?'polite':'off');$('#ccCaptions').textContent=value?'HIDE CAPTIONS':'SHOW CAPTIONS';}
 function execute(raw){const p=core.parse(raw);if(!p)return false;try{if(p.type==='show'||p.type==='favorites'){favoritesOnly=p.type==='favorites';render();show();}
  else if(p.type==='captions'){toggleCaption(p.value);show();}
  else if(p.type==='request')request(p.name);
  else if(p.type==='confirm'){if(!pending){show();status('No recipient request is waiting. Say “Call [saved name]” first.');}else approve().catch(e=>status(e.message));}
  else if(p.type==='cancel')cancel();
  else if(p.type==='brief'){$(p.field==='goal'?'#ccGoal':'#ccNotes').value=p.value.slice(0,p.field==='goal'?1000:4000);show();status('Call '+p.field+' updated in this page.');}
  else if(p.type==='save'){save({name:p.name,phone:p.phone,method:p.method||'telephone'});}
  else{const c=exact(p.name);if(c){if(p.type==='prepare')prepare(c);else{const next={...c,aliases:c.aliases.join(',')};if(p.type==='alias')next.aliases=[...c.aliases,core.clean(p.value)].join(',');if(p.type==='method')next.method=p.value;if(p.type==='favorite')next.favorite=p.value;save(next);}}}
 }catch(e){show();status(e.message);}return true;}
 $('#ccAll').onclick=()=>{favoritesOnly=false;render();};$('#ccFavorites').onclick=()=>{favoritesOnly=true;render();};$('#ccNew').onclick=()=>edit(null);
 $('#ccSave').onclick=()=>{try{save({id:selected,name:$('#ccName').value,aliases:$('#ccAliases').value,phone:$('#ccPhone').value,method:$('#ccMethod').value,favorite:$('#ccFavorite').checked});}catch(e){status(e.message);}};
 $('#ccRequest').onclick=()=>{if(!selected){status('Save or choose a contact before reviewing a call.');return;}const c=contacts.find(c=>c.id===selected);if(c)prepare(c);requestId(selected);};$('#ccApprove').onclick=()=>approve().catch(e=>status(e.message));$('#ccCancel').onclick=()=>cancel();$('#ccCaptions').onclick=()=>toggleCaption(!captionOn);
 $('#ccLobby').onclick=()=>{try{window.SCOTTYCalls.enableLobby();status('Lobby requested. Verify the room security settings in Jitsi.');}catch(e){status(e.message);}};
 window.SCOTTYCallExtras={execute,caption,resetCaptions(){captionRows=[];$('#ccCaptionText').textContent='';},cancel:()=>cancel(false)};
 // Replace the legacy name lookup; its earlier voice routes now use this exact resolver.
 window.SCOTTYContactCalls={request};render();
})();
