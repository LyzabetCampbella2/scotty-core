(function(root){
 const historyKey='scotty_call_history_v1';
 function parse(raw){const s=String(raw||'').trim().replace(/^(?:hey\s+)?(?:scotty|scottie|scoty)[,\s]+/i,'').replace(/[.!?]+$/,'');let m;
  const commands={'summarize this call':'summary','summarise this call':'summary','summarize call':'summary','draft tasks from this call':'tasks','turn this call into tasks':'tasks','save call summary':'saveSummary','save call history':'saveHistory','show call history':'history','export call history':'export','resume call':'resume','stop call conference':'stopConference','clear call project':'clearProject','use computer voice engine':'computer','use device voice engine':'device','refresh call resources':'resources'};
  if(commands[s.toLowerCase()])return {type:commands[s.toLowerCase()]};
  if((m=s.match(/^use (?:call )?project (.+)$/i)))return {type:'project',name:m[1]};
  if((m=s.match(/^bring (.+?) into (?:the )?call$/i)))return {type:'agent',name:m[1]};
  if((m=s.match(/^draft call task (.+)$/i)))return {type:'manualTask',title:m[1]};
  return null;
 }
 function cleanTurns(input){return (Array.isArray(input)?input:[]).filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.text==='string').slice(-100).map(x=>({role:x.role,text:x.text.slice(0,6000),at:Number(x.at)||Date.now()}));}
 function history(input){return (Array.isArray(input)?input:[]).filter(x=>x&&typeof x.id==='string').slice(-30).map(x=>({id:x.id,started:Number(x.started)||0,ended:Number(x.ended)||0,project:String(x.project||'').slice(0,160),summary:String(x.summary||'').slice(0,12000),turns:cleanTurns(x.turns)}));}
 root.SCOTTYCallSessionCore={parse,cleanTurns,history,historyKey};
})(typeof window!=='undefined'?window:globalThis);
