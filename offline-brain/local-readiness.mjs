/**
 * Phase 4 readiness diagnostic: local computer summary + optional installed-model
 * presence. No auto-install, telemetry, inference, Groq, production access.
 */
import {totalmem,freemem,cpus,arch,platform} from "node:os";
const ENDPOINT="http://127.0.0.1:11434/api/tags";
const VALID=/^[a-z0-9][a-z0-9._/-]{0,90}(?::[a-z0-9][a-z0-9._-]{0,40})?$/i;
const CLOUD=/(^|[\/:_-])(cloud|remote|hosted)([\/:_-]|$)/i;
const gib=n=>Math.round(n/1024**3*10)/10;
export function localMachineSummary({system={totalmem,freemem,cpus,arch,platform}}={}){
 const ram=system.totalmem(),free=system.freemem(),coreList=system.cpus();
 return Object.freeze({platform:system.platform(),architecture:system.arch(),cpuLogicalCount:coreList.length,
  physicalRAMGiB:gib(ram),currentlyAvailableRAMGiB:gib(free),
  suitability:"NOT_EVALUATED",recommendedModel:null,
  note:"RAM and storage needs depend on the actual model/context and competing processes. Disk model size is not RAM usage; this check does not select hardware, install a model, or verify GPU support.",
  localOnly:true,networkCalls:0,groqCalls:0,productionWrites:0});
}
export async function inspectInstalledLocalModel({
 enabled=false,model,fetcher=globalThis.fetch,timeoutMs=5000
}={}){
 if(!enabled)return {state:"DISABLED",modelPresent:false,model:null,probed:false,networkCalls:0,productionWrites:0};
 if(typeof model!=="string"||!VALID.test(model)||CLOUD.test(model))throw Error("Only a valid installed local model may be inspected");
 if(typeof fetcher!=="function")throw Error("Fetch implementation missing");
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),Math.min(Math.max(1000,timeoutMs),10000));
 try{
  const res=await fetcher(ENDPOINT,{method:"GET",redirect:"error",headers:{accept:"application/json"},signal:controller.signal});
  if(res?.status!==200)throw Error("No local Ollama model listing: HTTP "+(res?.status??"unknown"));
  const size=Number(res.headers?.get?.("content-length")||0);
  if(size>=200000)throw Error("Local model metadata too large");
  const raw=await res.text();
  if(raw.length>=200000)throw Error("Local model metadata too large");
  const payload=JSON.parse(raw);
  if(!Array.isArray(payload.models)||payload.models.length>500)throw Error("Invalid local model list");
  const candidate=payload.models.find(entry=>
    entry&&entry.name===model&&entry.model!==undefined&&!CLOUD.test(entry.model||"")&&Number(entry.size)>1000000);
  return Object.freeze({state:candidate?"MODEL_INSTALLED_LOCAL_METADATA":"MODEL_NOT_INSTALLED_OR_CLOUD",
   modelPresent:!!candidate,model,probed:true,
   modelDiskBytes:candidate?Math.trunc(Number(candidate.size)):null,
   note:"Local Ollama reported this installed model; this does not prove quality, licensing, available RAM, lack of plugins, or security of its installation.",
   networkCalls:1,endpoint:"127.0.0.1",productionWrites:0,groqCalls:0,grokCalls:0});
 }finally{clearTimeout(timer);}
}
