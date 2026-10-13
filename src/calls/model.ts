export function callTurns(input:any){return (Array.isArray(input)?input:[]).filter(t=>t&&['user','assistant'].includes(t.role)&&typeof t.text==='string').slice(-40).map(t=>({role:t.role,text:t.text.slice(0,3000)}));}
export function callDraft(raw:string){
 let v:any;try{v=JSON.parse(raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''))}catch{throw Error('The model did not return a reviewable draft. Try again.');}
 const summary=String(v.summary||'').slice(0,12000);
 const tasks=(Array.isArray(v.tasks)?v.tasks:[]).slice(0,12).map((t:any)=>({title:String(t.title||'').trim().slice(0,500),notes:String(t.notes||'').slice(0,3000)})).filter((t:any)=>t.title);
 return {summary,tasks};
}
export function voicePayload(b:any){
 if(!['transcribe','speak'].includes(b.type))throw Error('Unsupported voice operation.');
 if(b.type==='speak'){const text=String(b.text||'').trim();if(!text||text.length>220||!['bm_george','am_michael'].includes(b.voice))throw Error('Invalid speech request.');return {type:'speak',text,voice:b.voice};}
 const pcm=String(b.pcm||'');if(!pcm||pcm.length>1024000||!/^[A-Za-z0-9+/]+={0,2}$/.test(pcm))throw Error('Invalid audio request.');
 const bytes=Buffer.from(pcm,'base64');if(!bytes.length||bytes.length%4||bytes.length>16000*12*4)throw Error('Audio must be at most 12 seconds of 16 kHz float32 PCM.');
 for(let i=0;i<bytes.length;i+=4){const n=bytes.readFloatLE(i);if(!Number.isFinite(n)||Math.abs(n)>1.001)throw Error('Invalid PCM sample.');}
 return {type:'transcribe',pcm};
}
export function voiceResult(type:string,b:any){
 if(b.error)return {error:String(b.error).slice(0,500)};
 if(type==='transcribe')return {text:String(b.text||'').slice(0,3000)};
 const pcm=String(b.pcm||'');if(!pcm||pcm.length>4000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(pcm)||Number(b.sampleRate)!==24000)throw Error('Invalid computer speech result.');
 const bytes=Buffer.from(pcm,'base64');if(!bytes.length||bytes.length%4)throw Error('Invalid computer PCM.');for(let i=0;i<bytes.length;i+=4)if(!Number.isFinite(bytes.readFloatLE(i))||Math.abs(bytes.readFloatLE(i))>1.001)throw Error('Invalid computer PCM sample.');
 return {pcm,sampleRate:24000};
}
