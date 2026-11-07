/** Explicit owner-session adapter boundary for future staging integration.
 * Never trusts client-provided roles, subject, permissions or project IDs.
 */
const PROJECT=/^[A-Za-z0-9_-]{1,100}$/;
const ownerPermissions=Object.freeze(['workspace:read','assignment:propose','assignment:approve','knowledge:propose','knowledge:approve']);
export function createOwnerWorkspaceContextFactory({verifyOwnerSession,loadAuthorizedProjectIds,newId}={}){
 if(typeof verifyOwnerSession!=='function'||typeof loadAuthorizedProjectIds!=='function'||typeof newId!=='function')throw Error('TRUSTED_DEPENDENCIES_REQUIRED');
 return async function contextFromRequest(request){
  if(!request||typeof request.headers?.get!=='function')throw Error('INVALID_REQUEST');
  if(!(await verifyOwnerSession(request)))throw Error('UNAUTHENTICATED');
  const projects=await loadAuthorizedProjectIds();
  if(!Array.isArray(projects)||!projects.length||projects.some(p=>typeof p!=='string'||!PROJECT.test(p)))throw Error('PROJECT_SCOPE_UNAVAILABLE');
  const permissions=Object.fromEntries([...new Set(projects)].map(p=>[p,[...ownerPermissions]]));
  return Object.freeze({verifiedByServer:true,subject:'owner',roles:Object.freeze(['owner']),permissions,nextId:()=>newId()});
 };
}
export function rejectUnsafeWorkspaceRequest(request){
 if(!request||!['GET','POST'].includes(request.method))throw Error('METHOD_NOT_ALLOWED');
 const origin=request.headers?.get('origin');
 const host=request.headers?.get('host');
 if(request.method==='POST'&&(!origin||!host||new URL(origin).host!==host))throw Error('SAME_ORIGIN_REQUIRED');
 return true;
}
