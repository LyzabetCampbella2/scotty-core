import {readFile,writeFile,mkdir} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {refreshPublicKnowledge,updatesForAgent} from "./refresh-public.mjs";
import {buildSyntheticRoster} from "./catalog.mjs";
function option(flag){const i=process.argv.indexOf(flag);return i<0?null:process.argv[i+1]||null;}
function usage(){throw new Error("Usage: --refresh-public --output ./data/public-sources.json [--previous ./data/old.json] OR --view ./data/public-sources.json --agent agent-id");}
async function main(){
 const output=option("--output"),view=option("--view"),agent=option("--agent"),previous=option("--previous");
 if(view){
  if(!agent)usage();
  const data=JSON.parse(await readFile(view,"utf8"));
  process.stdout.write(JSON.stringify(updatesForAgent(data,agent),null,2)+"\n");
  return;
 }
 if(!process.argv.includes("--refresh-public")||!output||agent)usage();
 const prev=previous?JSON.parse(await readFile(previous,"utf8")):null;
 const snapshot=await refreshPublicKnowledge({allowPublicNetwork:true,previous:prev});
 const full=resolve(output);
 await mkdir(dirname(full),{recursive:true,mode:0o700});
 await writeFile(full,JSON.stringify(snapshot,null,2)+"\n",{mode:0o600,flag:"w"});
 const counts=Object.fromEntries(snapshot.coverage.map(c=>[c.department,{feedsSuccessful:c.feedsSuccessful,articleReferences:c.visibleItems}]));
 process.stdout.write(JSON.stringify({result:"PUBLIC_DISCOVERY_SNAPSHOT_CREATED",output:full,agents:buildSyntheticRoster().length,
  records:snapshot.recordCount,sourceErrors:snapshot.runs.filter(x=>x.status!=="ok").map(x=>({sourceId:x.sourceId,reason:x.reason})),departments:counts,
  providerCalls:snapshot.providerCalls,productionWrites:snapshot.productionWrites,verifiedFactCount:0},null,2)+"\n");
 if(!snapshot.runs.some(x=>x.status==="ok")){process.exitCode=1;}
}
main().catch(e=>{process.stderr.write("Public update failure: "+String(e.message).slice(0,300)+"\n");process.exitCode=1;});
