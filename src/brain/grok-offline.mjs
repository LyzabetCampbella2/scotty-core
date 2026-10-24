/**
 * Grok-ready, deliberately disconnected SCOTTY brain scaffold.
 * NOT a client: no network, credentials, database, imports or side effects.
 * Never registered in production; existing Groq system remains unchanged.
 */
export const GROK_BRAIN_MODE = 'disconnected';
export const GROK_BRAIN_PROVIDER = 'xai-grok';
export const GROK_DEFAULT_MODEL = 'grok-4.7';
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;
function safeId(v,name) {
  if(typeof v!=='string'||!ID.test(v)) throw new TypeError(name+' must be a safe explicit identifier');
  return v;
}
export function prepareOfflineGrokBrain(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)) throw new TypeError('Request object required');
  const requestId=safeId(input.requestId,'requestId');
  const projectId=input.projectId==null?null:safeId(input.projectId,'projectId');
  const agentId=input.agentId==null?null:safeId(input.agentId,'agentId');
  const model=input.model==null?GROK_DEFAULT_MODEL:safeId(input.model,'model');
  const intent=input.intent||'answer';
  if(!['answer','review','recommend-agents','summarize'].includes(intent)) throw new TypeError('Unsupported offline intent');
  const messages=input.messages??[];
  if(!Array.isArray(messages)||messages.length>24||messages.some(m=>!m||!['user','system','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>12000)) throw new TypeError('Invalid message metadata');
  const refs=input.approvedReferenceIds??[];
  if(!Array.isArray(refs)||refs.length>50||refs.some(ref=>typeof ref!=='string'||!ID.test(ref))) throw new TypeError('Invalid approved reference identifiers');
  if(refs.length&&!projectId) throw new Error('Explicit project required for approved source references');
  if(new Set(refs).size!==refs.length) throw new Error('Duplicate approved reference identifiers');
  return Object.freeze({
    requestId,provider:GROK_BRAIN_PROVIDER,mode:GROK_BRAIN_MODE,model,intent,projectId,agentId,
    messageCount:messages.length,approvedReferenceCount:refs.length,
    executed:false,connected:false,providerCalls:0,productionWrites:0,
    approvalNeededBeforeActivation:true,
    result:'Grok is not connected. No answer was generated.'
  });
}
export async function invokeGrokOffline() {
  return Object.freeze({
    ok:false,code:'GROK_DISCONNECTED',provider:GROK_BRAIN_PROVIDER,providerCalls:0,
    message:'Grok is not connected. SCOTTY continues using the existing production brain.'
  });
}
