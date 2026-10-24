/**
 * Manual Cloudflare Builds PRE-DEPLOY gate for isolated iPad Brain Lab.
 *
 * This gate checks *configuration only*; it cannot verify billing plan.
 * It refuses a Cloudflare Git build until the owner enters the explicit
 * Free-plan confirmation variable in the staging project's BUILD settings.
 * Node 22+; no API keys, network calls, production resources or deployments.
 */
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";

export const LAB_NAME="scotty-independent-ipad-brain-lab";
export const LAB_BRANCH="dev/ipad-cloudflare-staging-gates-20261024";
const dir=dirname(fileURLToPath(import.meta.url));
export function stagingPreflight({config,env={}}={}){
 const errors=[];
 const fail=s=>errors.push(s);
 if(!config||typeof config!=="object"||Array.isArray(config))return {pass:false,errors:["Worker JSON configuration missing"]};
 if(config.name!==LAB_NAME)fail("Worker name does not match dedicated staging lab");
 if(config.main!=="./worker.mjs")fail("Worker entrypoint is not isolated lab source");
 if(config.workers_dev!==true)fail("Staging lab must use independent workers.dev host");
 if(config.vars?.AI_ENABLED!=="false")fail("AI must remain disabled in source");
 if(config.vars?.BRAIN_ENVIRONMENT!=="ISOLATED_RESEARCH_ONLY")fail("Only isolated research mode allowed");
 if(config.ai?.binding!=="AI")fail("Only an explicit AI binding may be added");
 for(const key of ["routes","route","triggers","kv_namespaces","d1_databases","r2_buckets",
  "durable_objects","vectorize","hyperdrive","services","queues","analytics_engine_datasets",
  "unsafe","containers","dispatch_namespaces","send_email","observability","migrations"]){
  if(config[key]!=null)fail("Unexpected Worker resource/config: "+key);
 }
 if(Object.keys(config.vars||{}).some(k=>/TOKEN|KEY|PASSWORD|DATABASE|SECRET|GROQ|XAI|OPENAI|CLOUDFLARE/i.test(k)))fail("Secret-looking variable names cannot appear in public config");
 if(config.env)fail("Environment overlays are not approved for this lab");
 if(env.WORKERS_CI){
   if(env.WORKERS_CI_BRANCH!==LAB_BRANCH)fail("Cloudflare build branch does not match isolated staging branch");
   if(env.SCOTTY_STAGING_FREE_CONFIRMED!=="YES_CONFIRMED_WORKERS_FREE")fail("Owner has not confirmed Workers Free in BUILD settings");
 }
 return Object.freeze({pass:errors.length===0,errors,
  name:LAB_NAME,branch:LAB_BRANCH,aiDefault:"OFF",
  productionConnections:0,aiInvocations:0,
  billingPlanCheckedProgrammatically:false,
  note:"Manual owner account-plan confirmation is NOT independent billing verification."});
}
export function runStagingPreflight(){
 let config;
 try{config=JSON.parse(readFileSync(join(dir,"wrangler.jsonc"),"utf8"));}
 catch{return {pass:false,errors:["Could not read isolated Worker config"]};}
 return stagingPreflight({config,env:process.env});
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const result=runStagingPreflight();
 process.stdout.write(JSON.stringify(result,null,2)+"\n");
 if(!result.pass)process.exitCode=1;
}
