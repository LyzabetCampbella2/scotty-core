/* S.C.O.T.T.Y. voice workspace 31–40: local, review-first capabilities. */
(function(){
const KEY='scotty_voice_31_40';
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}};
const state=Object.assign({captures:[],comparison:[],handoff:null,layout:null},load());
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
const clean=s=>String(s||'').trim().slice(0,5000);
const norm=s=>clean(s).toLowerCase().replace(/\s+/g,' ');
const respond=msg=>{const node=document.getElementById('scottyVoiceWorkspaceStatus');if(node)node.textContent=msg;window.dispatchEvent(new CustomEvent('scotty:workspace-response',{detail:{text:msg}}));return true};
const selected=()=>[...document.querySelectorAll('[aria-selected="true"],[data-selected="true"],.node.selected,.selected[data-node-id]')].map(n=>clean(n.getAttribute('aria-label')||n.getAttribute('data-node-id')||n.textContent).slice(0,120)).filter(Boolean).slice(0,8);
const agents=()=>[...document.querySelectorAll('[data-agent-status],[data-agent-id]')].map(el=>({name:clean(el.getAttribute('data-agent-name')||el.getAttribute('data-agent-id')||el.textContent).slice(0,80),status:clean(el.getAttribute('data-agent-status')||'unknown')})).filter(a=>a.name).slice(0,30);
const command=raw=>{
const phrase=clean(raw).replace(/^(?:hey\s+)?scotty[,\s]*/i,'').replace(/^please\s+/i,'');const q=norm(phrase);let m;
if(/^(help me sort these thoughts|sort my thoughts|start brain dump)$/.test(q))return respond('Speak or type: capture thoughts followed by your ideas. I will store them for review and separate questions and tasks by wording.');
m=phrase.match(/^(?:capture thoughts|brain dump|sort these thoughts)[:\s]+(.+)$/is);
if(m){const text=clean(m[1]),parts=text.split(/(?<=[.!?])\s+/).filter(Boolean);const entry={at:new Date().toISOString(),notes:[],tasks:[],questions:[]};for(const part of parts){if(/\?$/.test(part))entry.questions.push(part);else if(/^(?:i need to|todo|to do|remember to|task:)/i.test(part))entry.tasks.push(part);else entry.notes.push(part)}state.captures.push(entry);state.captures=state.captures.slice(-25);save();return respond('Captured for review: '+entry.notes.length+' notes, '+entry.tasks.length+' possible tasks, and '+entry.questions.length+' questions. Nothing was assigned automatically.')}
if(/^(review (?:my )?(?:brain dump|captured thoughts)|show sorted thoughts)$/.test(q)){const e=state.captures.at(-1);return respond(e?'Notes: '+e.notes.join('; ')+'. Possible tasks: '+e.tasks.join('; ')+'. Questions: '+e.questions.join('; '):'No thoughts captured yet.')}
if(/^(compare these two drafts|compare selected drafts|compare these two options)$/.test(q)){const s=selected();if(s.length<2)return respond('Select two draft or option nodes first. No document text was accessed.');state.comparison=s.slice(0,2);save();return respond('Comparison workspace prepared for '+s[0]+' and '+s[1]+'. Connect or open both texts for a content-level comparison.')}
if(/^(who.s available to help with this|agent roll call|who is available|which agents are busy)$/.test(q)){const a=agents();return respond(a.length?'Agent statuses visible in the HUD: '+a.map(x=>x.name+' — '+x.status).join('; '):'No live agent presence data is exposed on this screen. I cannot verify who is available or busy.')}
m=phrase.match(/^ask\s+(.+?)\s+(?:to\s+)?(?:review|about|whether)\s+(.+)$/i);
if(m)return respond('Specialist request prepared for '+clean(m[1])+': '+clean(m[2])+'. An agent execution connection is required before I can send it. No agent was contacted.');
if(/^(how did you reach that conclusion|explain your findings|explain the agent.s work|show your sources)$/.test(q))return respond('I can explain a finding only when its evidence or agent report is available. Open the relevant report or agent result to review sources and uncertainties.');
if(/^(walk me through this project|give me a canvas tour|tour this workspace)$/.test(q)){const s=selected();return respond(s.length?'Canvas tour selection: '+s.join(', ')+'. These are the currently selected nodes; full spatial narration requires graph coordinates.':'Select a project or nodes to start a canvas tour.')}
m=phrase.match(/^arrange (?:these |my )?nodes by (project|agent|type|status)$/i);
if(m){state.layout=m[1];save();return respond('Layout preference saved: group nodes by '+m[1]+'. The graph layout engine has not been changed; use the existing layout controls to apply changes.')}
if(/^(prepare this session for my computer|prepare device handoff|handoff to my computer)$/.test(q)){state.handoff={at:new Date().toISOString(),selected:selected(),goal:window.SCOTTYWorkspaceVoice?.state?.goal||'',checkpoint:window.SCOTTYWorkspaceVoice?.state?.checkpoint||null};save();return respond('Device handoff summary prepared on this device. No cross-device sync is connected. Do not assume another device has received it.')}
if(/^(why can.t you open that file|diagnose my connection|what connection is unavailable|why isn.t this working)$/.test(q)){const online=navigator.onLine?'Browser reports network online':'Browser reports network offline';return respond(online+'. File access requires a connected file provider and authorization. The browser cannot confirm remote service health from this screen.')}
if(/^(what are you listening to and where is it going|what are you listening to|voice privacy status|show microphone and camera privacy)$/.test(q)){const mic=!!document.getElementById('mic')?.classList.contains('listening'),camera=!!document.getElementById('vision')?.classList.contains('on');return respond('HUD indicators: microphone '+(mic?'listening':'not shown as listening')+', Eyes On camera '+(camera?'active':'not shown as active')+'. These indicators do not independently verify hardware access or network destinations. Review browser permissions and backend logs for full data routing.')}
return false;
};
window.SCOTTYWorkspaceVoice3140={execute:command,state};
})();