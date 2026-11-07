import {test} from 'node:test';import assert from 'node:assert/strict';
import {createOwnerWorkspaceContextFactory,rejectUnsafeWorkspaceRequest} from './workspace-owner-auth-boundary.mjs';
const request=(method='GET',origin='https://scotty.example')=>({method,headers:{get:key=>({host:'scotty.example',origin})[key]??null}});
test('missing trusted dependencies fail closed',()=>assert.throws(()=>createOwnerWorkspaceContextFactory({})));
test('invalid owner session denied',async()=>{const fn=createOwnerWorkspaceContextFactory({verifyOwnerSession:async()=>false,loadAuthorizedProjectIds:async()=>['synthetic'],newId:()=>crypto.randomUUID()});await assert.rejects(fn(request()),/UNAUTHENTICATED/);});
test('unavailable project scopes denied',async()=>{const fn=createOwnerWorkspaceContextFactory({verifyOwnerSession:async()=>true,loadAuthorizedProjectIds:async()=>[],newId:()=>crypto.randomUUID()});await assert.rejects(fn(request()),/PROJECT_SCOPE_UNAVAILABLE/);});
test('trusted context does not read client-supplied permissions',async()=>{const fn=createOwnerWorkspaceContextFactory({verifyOwnerSession:async()=>true,loadAuthorizedProjectIds:async()=>['synthetic'],newId:()=>crypto.randomUUID()});const ctx=await fn({...request(),body:{roles:['admin'],permissions:{other:['workspace:read']}}});assert.deepEqual(Object.keys(ctx.permissions),['synthetic']);assert.equal(ctx.verifiedByServer,true);assert.equal(ctx.permissions.other,undefined);});
test('cross-origin writes denied',()=>{assert.throws(()=>rejectUnsafeWorkspaceRequest(request('POST','https://evil.example')));assert.equal(rejectUnsafeWorkspaceRequest(request('POST')),true);});
test('missing origin denied on write',()=>assert.throws(()=>rejectUnsafeWorkspaceRequest(request('POST',null))));
