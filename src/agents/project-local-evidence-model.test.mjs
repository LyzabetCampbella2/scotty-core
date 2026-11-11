import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedLocalAttachment,assertSameLocalFile} from './project-local-evidence-model.mjs';
const preview={p:'project-bloodpool',fileId:'file-12345678',name:'chapter.pdf',
 sha256:'synthetic-sha256-abcdef',referenceOnly:false,expires:Date.now()+600000};
const consent={previewToken:'review-token',approved:true,reviewed:true,agentIds:['agent-plot']};
test('a reviewed project PDF permits only explicit recipient snapshot approval',()=>{
 const accepted=reviewedLocalAttachment(preview,consent,'project-bloodpool');
 assert.deepEqual(accepted.agentIds,['agent-plot']);
 assert.equal(accepted.description,'');
 assert.equal(assertSameLocalFile(preview,{name:preview.name,sha256:preview.sha256,projectId:'project-bloodpool'}),true);
});
test('wrong project, stale preview, changed bytes and missing approvals are all blocked',()=>{
 assert.throws(()=>reviewedLocalAttachment(preview,consent,'project-goldenhour'),/WRONG_PROJECT/);
 assert.throws(()=>reviewedLocalAttachment({...preview,expires:Date.now()-1},consent,'project-bloodpool'),/EXPIRED/);
 assert.throws(()=>reviewedLocalAttachment(preview,{...consent,approved:false},'project-bloodpool'),/APPROVAL/);
 assert.throws(()=>reviewedLocalAttachment(preview,{...consent,agentIds:['agent-plot','agent-plot']},'project-bloodpool'),/RECIPIENTS/);
 assert.throws(()=>assertSameLocalFile(preview,{name:preview.name,sha256:'changed',projectId:'project-bloodpool'}),/CHANGED/);
 assert.throws(()=>assertSameLocalFile(preview,{name:preview.name,sha256:preview.sha256,projectId:'project-goldenhour'}),/CHANGED/);
});
test('image descriptions come from explicit owner wording, never from automatic image analysis',()=>{
 const image={...preview,referenceOnly:true,name:'cat.webp'};
 assert.throws(()=>reviewedLocalAttachment(image,consent,'project-bloodpool'),/IMAGE_DESCRIPTION/);
 const result=reviewedLocalAttachment(image,{...consent,description:'Owner describes a fictional cat in a studio.'},'project-bloodpool');
 assert.equal(result.description,'Owner describes a fictional cat in a studio.');
});
