import { ServiceMonitor, type Probe } from './monitor';
import { reliability } from './core';
export function createLocalServiceMonitor(origin:string) {
 const services = [
  {service:'eyes' as const,path:'/api/eyes/status'},
  {service:'voice' as const,path:'/api/voice/status'},
  {service:'memory' as const,path:'/api/memory/status'}
 ];
 const probes:Probe[]=services.map(({service,path})=>({
  service,timeoutMs:4000,async check(signal){
   const response=await fetch(new URL(path,origin),{signal,headers:{'accept':'application/json'}});
   if(!response.ok)throw new Error('Status route unavailable');
   const body=await response.json();
   // Configuration alone does not prove a provider works; report only the local adapter status.
   if(body?.ok!==true)throw new Error('Adapter not ready');
   if(service==='voice'||service==='memory')throw new Error('Compatibility adapter not yet operational');
  }
 }));
 return new ServiceMonitor(probes,15000);
}
