/** Pure checks; database membership and exact bytes are revalidated independently. */
export function reviewedLocalAttachment(preview,input,projectId,now=Date.now()){
 if(!preview||preview.p!==projectId||preview.expires<=now||input?.previewToken==null)
  throw Error('FILE_PREVIEW_EXPIRED_OR_WRONG_PROJECT');
 if(input.approved!==true||input.reviewed!==true)throw Error('OWNER_FILE_EVIDENCE_APPROVAL_REQUIRED');
 const ids=input.agentIds;
 if(!Array.isArray(ids)||ids.length<1||ids.length>128||new Set(ids).size!==ids.length||
   ids.some(id=>typeof id!=='string'||!/^[A-Za-z0-9_-]{1,160}$/.test(id)))
  throw Error('INVALID_EVIDENCE_RECIPIENTS');
 const description=String(input.description||'').trim();
 if(preview.referenceOnly&&(!description||description.length>1400))
  throw Error('OWNER_IMAGE_DESCRIPTION_REQUIRED');
 return {agentIds:[...ids],description};
}
export function assertSameLocalFile(preview,file){
 if(!file||file.sha256!==preview.sha256||file.name!==preview.name||file.projectId!==preview.p)
  throw Error('FILE_CHANGED_AFTER_PREVIEW');
 return true;
}
