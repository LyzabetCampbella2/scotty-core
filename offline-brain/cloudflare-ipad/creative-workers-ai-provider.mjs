/**
 * Optional Cloudflare Workers AI provider for the isolated creative engine.
 * SOURCE ONLY; not imported by Worker or reachable from Activepieces.
 * Requires approved Cloudflare binding and separate feature flag, model choice
 * and cost/rate limits. Does NOT provide owner/project/mission authorization.
 */
export const CREATIVE_WORKERS_AI_MODEL='@cf/meta/llama-3.2-3b-instruct';
const denied=s=>{throw Error(s);};
export function createCreativeWorkersAIAdapter(env){
 if(env?.SCOTTY_CREATIVE_AI_ENABLED!=='true'||
   env?.SCOTTY_CREATIVE_AI_MODEL!==CREATIVE_WORKERS_AI_MODEL||
   env?.SCOTTY_CREATIVE_AI_MAX_CALLS!=='1'||
   env?.SCOTTY_CREATIVE_PUBLIC_ONLY!=='true'||
   typeof env?.AI?.run!=='function')
   denied('CREATIVE_AI_PROVIDER_NOT_APPROVED_OR_CONFIGURED');
 let used=false;
 return Object.freeze({
  provider:'CLOUDFLARE_WORKERS_AI_CONFIGURABLE',
  model:CREATIVE_WORKERS_AI_MODEL,
  async run({agentId,instruction,input,maxTokens,temperature,stream}={}){
   if(used)denied('CREATIVE_PROVIDER_MAX_CALLS_REACHED');
   if(!/^((agent-creative-(pulse|frame|iris))|chief-lumen)$/.test(agentId||'')||
      typeof instruction!=='string'||instruction.length<100||instruction.length>14000||
      !input||typeof input!=='object'||Array.isArray(input)||
      !/^[a-z0-9][a-z0-9-]{2,79}$/.test(input.projectId||'')||
      !/^[a-z0-9][a-z0-9_-]{3,79}$/.test(input.missionId||'')||
      typeof input.assignment!=='string'||!input.assignment.trim()||
      input.assignment.length>1000||
      !Array.isArray(input.evidence)||input.evidence.length>8||
      maxTokens!==700||temperature!==0.2||stream!==false)
     denied('INVALID_CREATIVE_MODEL_CALL');
   // Reserve the one-call budget BEFORE provider invocation. No auto-retries.
   used=true;
   const prompt=JSON.stringify({
     task:input.assignment,projectId:input.projectId,missionId:input.missionId,
     approvedPublicEvidence:input.evidence
   });
   if(prompt.length>16000)denied('CREATIVE_MODEL_INPUT_TOO_LARGE');
   try{
    const result=await env.AI.run(CREATIVE_WORKERS_AI_MODEL,{
     messages:[
      {role:'system',content:instruction},
      {role:'user',content:prompt}
     ],
     max_tokens:700,
     temperature:0.2,
     stream:false
    });
    if(typeof result?.response!=='string'||!result.response.trim()||
       result.response.length>14000)denied('INVALID_CREATIVE_AI_RESPONSE');
    return {text:result.response};
   }catch{denied('CREATIVE_WORKERS_AI_UNAVAILABLE_NO_RETRY');}
  }
 });
}
