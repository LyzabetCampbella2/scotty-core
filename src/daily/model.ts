export function zone(value:any){const z=String(value||'America/Los_Angeles');try{new Intl.DateTimeFormat('en',{timeZone:z}).format(new Date());return z}catch{throw Error('Choose a valid time zone.')}}
export function parts(date:Date,timeZone:string){const p=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);const v=(k:string)=>p.find(x=>x.type===k)?.value||'';return {date:`${v('year')}-${v('month')}-${v('day')}`,time:`${v('hour')}:${v('minute')}`}}
export function localInstant(wall:string,timeZone:string){
 zone(timeZone);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wall))throw Error('Use a full date and time.');
 const naive=Date.parse(wall+':00Z');if(!Number.isFinite(naive))throw Error('Invalid date and time.');
 const candidates=new Set<number>();for(const h of [-24,-12,0,12,24]){const t=naive+h*3600000,p=parts(new Date(t),timeZone),offset=Date.parse(p.date+'T'+p.time+':00Z')-t,c=naive-offset;if(parts(new Date(c),timeZone).date+'T'+parts(new Date(c),timeZone).time===wall)candidates.add(c)}
 if(!candidates.size)throw Error('That local time does not exist because the clocks change. Choose another time.');return new Date(Math.min(...candidates));
}
export function dateAdd(date:string,days:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
export function nextDue(last:Date,repeat:string,timeZone:string,now=new Date()){
 if(repeat==='none')return null;const step=repeat==='weekly'?7:1,p=parts(last,timeZone);let day=p.date;
 for(let i=0;i<4000;i++){day=dateAdd(day,step);let next:Date;try{next=localInstant(day+'T'+p.time,timeZone)}catch{next=localInstant(day+'T03:00',timeZone)}if(next>now)return next}
 throw Error('Unable to calculate the next reminder.');
}
export function normalizeSchedule(input:any,now=new Date()){
 const title=String(input.title||'').trim().slice(0,500);if(!title)throw Error('A reminder title is required.');const timeZone=zone(input.timeZone),repeat=['none','daily','weekly'].includes(input.repeat)?input.repeat:'none';
 const due=input.wallTime?localInstant(String(input.wallTime),timeZone):new Date(String(input.dueAt||''));if(!Number.isFinite(due.getTime())||due<=now)throw Error('Choose a future reminder time.');return {title,timeZone,repeat,due};
}
export function overlap(a:any,b:any){return new Date(a.start)<new Date(b.end)&&new Date(a.end)>new Date(b.start)}
export function suggestions(start:Date,end:Date,events:any[]){const duration=end.getTime()-start.getTime(),out:any[]=[];for(let t=start.getTime()+900000;t<=start.getTime()+2*86400000&&out.length<3;t+=900000){const s={start:new Date(t).toISOString(),end:new Date(t+duration).toISOString()};if(!events.some(e=>overlap(s,e)))out.push(s)}return out}
export function planTasks(tasks:any[],energy:string,date:string,timeZone='America/Los_Angeles'){
 const limits:any={light:{count:2,minutes:45},normal:{count:4,minutes:120},ambitious:{count:6,minutes:240}},limit=limits[energy]||limits.normal,rank:any={critical:0,high:1,normal:2,low:3};
 const available=tasks.filter(t=>!['completed','cancelled','failed'].includes(t.status)).sort((a,b)=>{const due=(t:any)=>t.dueAt&&parts(new Date(t.dueAt),timeZone).date<=date?0:1;return due(a)-due(b)||(rank[a.priority]??2)-(rank[b.priority]??2)||new Date(a.dueAt||'2100-01-01').getTime()-new Date(b.dueAt||'2100-01-01').getTime()||String(a.title).localeCompare(String(b.title))});
 const selected:any[]=[],deferred:any[]=[];let minutes=0;for(const t of available){const estimate=Math.max(5,Math.min(240,Number(t.estimateMinutes)||25));if(selected.length<limit.count&&minutes+estimate<=limit.minutes&&(energy!=='light'||t.energy!=='high')){selected.push({...t,estimateMinutes:estimate});minutes+=estimate}else deferred.push(t)}return {energy:limits[energy]?energy:'normal',selected,deferred,minutes,budget:limit.minutes,note:energy==='light'?'Keep this small; postpone the rest or split a large task.':energy==='ambitious'?'Leave room for breaks and fixed commitments.':'A manageable shortlist with room for interruptions.'};
}
export function focusInput(input:any){const goal=String(input.goal||'').trim().slice(0,1000);if(!goal)throw Error('Choose one focus goal.');const minutes=Number(input.minutes),checkIn=Number(input.checkInMinutes||0);if(!Number.isInteger(minutes)||minutes<1||minutes>240)throw Error('Focus duration must be 1 to 240 minutes.');if(checkIn!==0&&(!Number.isInteger(checkIn)||checkIn<5||checkIn>60))throw Error('Check-ins must be off or every 5 to 60 minutes.');return {goal,minutes,checkIn}}
