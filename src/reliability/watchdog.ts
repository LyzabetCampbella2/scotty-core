import { reliability, type Service } from './core';
import { recordAudit } from './audit';
export class Watchdog {
 private active = new Map<string,{service:Service;started:number;timeout:number}>();
 private timer?: ReturnType<typeof setInterval>;
 begin(id:string,service:Service,timeoutMs=30000) {
  this.active.set(id,{service,started:Date.now(),timeout:timeoutMs});
  return () => this.active.delete(id);
 }
 inspect(now=Date.now()) {
  for(const [id,job] of this.active) {
   if(now-job.started>job.timeout) {
    reliability.report(job.service,'degraded','Operation exceeded timeout');
    void recordAudit({type:'watchdog',service:job.service,actionId:id,outcome:'timeout'}).catch(()=>{});
    this.active.delete(id);
   }
  }
 }
 start(){ if(!this.timer){this.timer=setInterval(()=>this.inspect(),5000);this.timer.unref?.();} }
 stop(){if(this.timer)clearInterval(this.timer);this.timer=undefined;}
}
export const watchdog=new Watchdog();
