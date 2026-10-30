/** Strict review boundary from an uploaded project file to project-scoped evidence.
 * Never ships file bytes to Workers AI or any external application.
 */
import {missionDb as db} from './mission-records.ts';
import {ensureProjectEvidence,approveEvidence,evidenceList} from './project-evidence.ts';
import {previewKind} from '../workspace/model.ts';
import {reviewedLocalAttachment,assertSameLocalFile} from './project-local-evidence-model.mjs';

const pending=new Map<string,any>();
const validId=(s:any)=>typeof s==='string'&&/^[a-z0-9_-]{8,180}$/i.test(s);
async function fileInProject(p:string,id:string,read:any=null){
 if(!validId(id)||typeof p!=='string'||!/^[a-z0-9_-]{1,160}$/i.test(p))throw Error('INVALID_PROJECT_FILE');
 await ensureProjectEvidence();
 const rows=await db()`select id,name,project_id,mime_type from scotty_files where id::text=${id} and project_id=${p} limit 1`;
 if(!rows.length)throw Error('FILE_OUTSIDE_PROJECT_OR_MISSING');
 const reader=read||(await import('../workspace/cloud.ts')).fileBytes;
 const file=await reader(id);
 if(file.projectId&&file.projectId!==p)throw Error('FILE_PROJECT_CHANGED');
 return {...file,name:rows[0].name,projectId:p};
}
export async function previewProjectLocalFile(p:string,input:any,read:any=null,extract:any=null){
 if(process.env.SCOTTY_PROJECT_DOCUMENTS_ENABLED!=='true')throw Error('PROJECT_DOCUMENTS_DISABLED');
 const file=await fileInProject(p,input?.fileId,read);
 if(file.bytes.length>20*1024*1024)throw Error('FILE_PREVIEW_LIMIT_EXCEEDED');
 const kind=previewKind(file.name,file.mime);
 if(!['pdf','docx','text','spreadsheet','image'].includes(kind))throw Error('UNSUPPORTED_EVIDENCE_FILE');
 let body='',note='',referenceOnly=false;
 if(kind==='image'){referenceOnly=true;note='Image pixels are not analyzed here. Supply your own description and review the image before approving it for an agent.';}
 else{
  const parser=extract||(await import('../workspace/exports.ts')).extractText;
  const extracted=await parser(file);
  body=String(extracted.text||'');
  if(!body.trim())throw Error('NO_EXTRACTABLE_TEXT');
  if(body.length>21000){body=body.slice(0,21000);note='PARTIAL: first 21,000 characters only. Choose a smaller document for complete evidence.';}
  else note=extracted.note||'Text snapshot; original layout and images are not included.';
 }
 const token=crypto.randomUUID(),createdAt=new Date().toISOString();
 for(const [key,value] of pending)if(value.expires<Date.now())pending.delete(key);
 if(pending.size>=100)throw Error('PREVIEW_CAPACITY_REACHED');
 pending.set(token,{p,fileId:input.fileId,sha256:file.sha256,name:file.name,kind,body,
  referenceOnly,createdAt,expires:Date.now()+600000});
 return {previewToken:token,fileId:input.fileId,title:file.name,kind,body,
  sha256:file.sha256,referenceOnly,previewedAt:createdAt,expiresInSeconds:600,note,
  externalUploads:0,agentPermissionsGranted:0};
}
export async function attachProjectLocalFile(p:string,input:any,read:any=null){
 if(process.env.SCOTTY_PROJECT_DOCUMENTS_ENABLED!=='true')throw Error('PROJECT_DOCUMENTS_DISABLED');
 const preview=pending.get(input?.previewToken);
 const reviewed=reviewedLocalAttachment(preview,input,p);
 const file=await fileInProject(p,preview.fileId,read);
 assertSameLocalFile(preview,file);
 let text=preview.body,limitation='';
 if(preview.referenceOnly){
  text='Owner description of image (not automatically verified from pixels): '+reviewed.description;
  limitation='Image remained in the project file store; the approved description is an owner-supplied reference, not image analysis.';
 }else limitation='Dated text snapshot only; formatting, figures and any later source edits are not included.';
 pending.delete(input.previewToken);
 const title=(preview.kind==='image'?'Image reference: ':'Text snapshot: ')+preview.name;
 const result=await approveEvidence(p,{approved:true,kind:'note',title:title.slice(0,240),
  body:'[Source: project file '+preview.fileId+'; SHA256 '+preview.sha256+'; captured '+preview.createdAt+']\n'+
   '[Limit: '+limitation+']\n'+text,
  reference:'workspace-file:'+preview.fileId,agentIds:reviewed.agentIds});
 const saved=(await evidenceList(p)).find((item:any)=>item.id===result.id);
 return {...result,evidenceReadbackVerified:Boolean(saved&&saved.recipients?.length===reviewed.agentIds.length),
  originalFileTransferred:false,externalUpload:false,sourceSha256:preview.sha256,
  snapshot:true,referenceOnly:preview.referenceOnly,limitation};
}
