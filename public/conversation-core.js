(function(root){
 const key='scottyConversationThreadsV2',prefsKey='scottyConversationPreferencesV2';
 function preferences(v={}){return {speed:Math.max(.65,Math.min(1.5,Number(v.speed)||1)),length:['brief','balanced','detailed'].includes(v.length)?v.length:'balanced',tone:['calm','warm','direct'].includes(v.tone)?v.tone:'calm',review:v.review===true,voiceModeVersion:1,pronunciations:String(v.pronunciations||'').slice(0,3000)}}
 function loadPreferences(storage){let saved={};try{const value=JSON.parse(storage.getItem(prefsKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}if(saved.voiceModeVersion!==1)saved={...saved,review:false};const prefs=preferences(saved);try{storage.setItem(prefsKey,JSON.stringify(prefs))}catch{}return prefs;}
 function chunks(text,limit=190){
  const words=String(text||'').trim().split(/\s+/),out=[];let part='';
  for(let word of words){while(word.length>limit){if(part){out.push(part);part=''}out.push(word.slice(0,limit));word=word.slice(limit)}if(!word)continue;if(part.length+word.length+1>limit){out.push(part);part=''}part+=(part?' ':'')+word}if(part)out.push(part);return out;
 }
 function pronounce(text,rules){
  let result=String(text||'');
  for(const line of String(rules||'').split('\n').slice(0,30)){
   const i=line.indexOf('=');if(i<1)continue;const word=line.slice(0,i).trim(),spoken=line.slice(i+1).trim();if(!word||!spoken)continue;
   const escaped=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   result=result.replace(new RegExp('(^|[^a-z0-9])('+escaped+')(?=$|[^a-z0-9])','gi'),(_,prefix)=>prefix+spoken);
  }return result;
 }
 function store(storage,uid=()=>crypto.randomUUID()){
  let state;try{state=JSON.parse(storage.getItem(key)||'null')}catch{}
  if(!state||!Array.isArray(state.threads)||!state.threads.length){state={active:'daily',threads:[{id:'daily',name:'Daily Life',turns:[]},{id:'writing',name:'Writing',turns:[]},{id:'business',name:'Business',turns:[]},{id:'study',name:'Study',turns:[]}]};try{const old=JSON.parse(storage.getItem('scottyConversationV1')||'[]');if(Array.isArray(old))state.threads[0].turns=old.filter(x=>['user','assistant'].includes(x.role)&&typeof x.text==='string').slice(-80)}catch{}}
  state.threads=state.threads.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string').slice(0,20).map(x=>({...x,turns:Array.isArray(x.turns)?x.turns.slice(-100):[]}));
  if(!state.threads.length)state.threads=[{id:'daily',name:'Daily Life',turns:[]}];
  if(!state.threads.some(x=>x.id===state.active))state.active=state.threads[0].id;
  let failed=false;
  const save=()=>{try{storage.setItem(key,JSON.stringify(state));failed=false}catch{failed=true}};
  const get=id=>state.threads.find(x=>x.id===(id||state.active));
  return {state,get,persisted:()=>!failed,save,add(name){if(state.threads.length>=20)throw Error('You can keep up to 20 threads on this device.');const t={id:uid(),name:String(name).trim().slice(0,80)||'New conversation',turns:[]};state.threads.push(t);state.active=t.id;save();return t},switch(id){if(!get(id))return false;state.active=id;save();return true},remember(role,text,id,extra={}){const t=get(id);if(!t||!['user','assistant'].includes(role))return;t.turns.push({role,text:String(text).slice(0,12000),at:Date.now(),...extra});t.turns=t.turns.slice(-100);save()},history(id,space){return (get(id)?.turns||[]).filter(x=>x.status!=='cancelled'&&(!space||(x.memorySpace||'shared')===space)).map(x=>({role:x.role,text:x.text})).slice(-24)},pending(value,id){const t=get(id);if(t){t.pending=value;save()}}};
 }
 root.SCOTTYConversationCore={preferences,loadPreferences,chunks,pronounce,store,key,prefsKey};
})(globalThis);
