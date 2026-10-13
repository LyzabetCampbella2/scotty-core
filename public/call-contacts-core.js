(function(root){
 const clean=s=>String(s||'').trim().replace(/\s+/g,' ').slice(0,80);
 const key=s=>clean(s).toLocaleLowerCase('en-US');
 function validate(value){
  const name=clean(value.name),aliases=[...new Set(String(value.aliases||'').split(',').map(clean).filter(Boolean))].slice(0,12);
  const phone=String(value.phone||'').trim(),method=value.method||'jitsi';
  if(!name)throw Error('Enter a contact name.');
  if(!['jitsi','telephone'].includes(method))throw Error('Choose Jitsi or telephone.');
  if(phone&&!/^\+?[0-9(). -]{7,24}$/.test(phone))throw Error('Enter a valid phone number or leave it blank.');
  if(method==='telephone'&&!phone)throw Error('Telephone contacts need a number. Dialing is not connected.');
  return {id:String(value.id||''),name,aliases,phone,method,favorite:!!value.favorite};
 }
 function resolve(contacts,name){const wanted=key(name);return contacts.filter(c=>key(c.name)===wanted||c.aliases.some(a=>key(a)===wanted));}
 function snapshot(c){return JSON.stringify([c.id,c.name,c.aliases,c.phone,c.method]);}
 function approval(pending,contacts,now=Date.now()){
  if(!pending||now-pending.created>120000)return null;
  const c=contacts.find(c=>c.id===pending.id);
  return c&&snapshot(c)===pending.snapshot?c:null;
 }
 function parse(raw){
  const s=String(raw||'').trim().replace(/^(?:hey\s+)?(?:scotty|scottie|scoty)[,\s]+/i,'').replace(/[.!?]+$/,'');let m;
  if(/^(?:show|open) (?:my )?(?:call )?contacts$/i.test(s))return {type:'show'};
  if(/^(?:show|open) (?:my )?(?:call )?favorites$/i.test(s))return {type:'favorites'};
  if(/^(?:show|hide) (?:live )?(?:call )?captions$/i.test(s))return {type:'captions',value:/^show/i.test(s)};
  if(/^confirm call$/i.test(s))return {type:'confirm'};
  if(/^(?:cancel call|cancel call request|do not call|don't call)$/i.test(s))return {type:'cancel'};
  if((m=s.match(/^(?:save|add|remember) contact (.+?) (?:at|number|phone number) (\+?[0-9(). -]{7,24})$/i)))return {type:'save',name:m[1],phone:m[2]};
  if((m=s.match(/^(?:save|add) (?:jitsi|internet) contact (.+)$/i)))return {type:'save',name:m[1],phone:'',method:'jitsi'};
  if((m=s.match(/^nickname (.+?) as (.+)$/i)))return {type:'alias',name:m[1],value:m[2]};
  if((m=s.match(/^use (jitsi|telephone) for (.+)$/i)))return {type:'method',name:m[2],value:m[1].toLowerCase()};
  if((m=s.match(/^(favorite|unfavorite) (.+)$/i)))return {type:'favorite',name:m[2],value:m[1].toLowerCase()==='favorite'};
  if((m=s.match(/^prepare (?:a )?call (?:with|to) (.+)$/i)))return {type:'prepare',name:m[1]};
  if((m=s.match(/^set call (goal|notes) to (.+)$/i)))return {type:'brief',field:m[1].toLowerCase(),value:m[2]};
  if((m=s.match(/^call (?:contact )?(.+)$/i))&&!/^(?:scotty|scottie|scoty|selected|selected nodes|those agents)$/i.test(m[1]))return {type:'request',name:m[1]};
  return null;
 }
 root.SCOTTYCallContactsCore={clean,key,validate,resolve,snapshot,approval,parse};
})(typeof window!=='undefined'?window:globalThis);
