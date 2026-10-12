import { mkdir, appendFile, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
export type AuditEvent = { time: string; type: string; service?: string; actionId?: string; outcome: string; detail?: string };
const path = process.env.SCOTTY_AUDIT_PATH;
const recent: AuditEvent[] = [];
export async function recordAudit(event: Omit<AuditEvent,'time'>) {
 const safe: AuditEvent = {time:new Date().toISOString(),type:event.type.slice(0,80),service:event.service?.slice(0,60),actionId:event.actionId?.slice(0,120),outcome:event.outcome.slice(0,80)};
 // Do not log arbitrary detail, payloads, tokens, prompts, personal content or provider responses.
 recent.push(safe); if(recent.length>200) recent.shift();
 if(path) { await mkdir(dirname(path),{recursive:true}); await appendFile(path,JSON.stringify(safe)+'\n',{mode:0o600}); }
}
export function recentAudit() { return recent.slice(-100); }
export async function loadAudit() {
 if(!path) return;
 try { const lines=(await readFile(path,'utf8')).trim().split('\n').slice(-200); for(const line of lines) {const value=JSON.parse(line);if(value?.time&&value?.type)recent.push(value)} recent.splice(0,Math.max(0,recent.length-200)); } catch(e:any) { if(e?.code!=='ENOENT') throw e; }
}
