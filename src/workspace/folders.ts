import postgres from 'postgres';
import {bootstrapResources} from '../resources/cloud.ts';
import {addonRead} from '../connectors/adapters.ts';
import {folderName,assertFolderMove,googleDocumentURL} from './folders-model.ts';
let sql:any;const db=()=>sql||(sql=postgres(process.env.DATABASE_URL||'',{max:3,ssl:'require',connect_timeout:12,idle_timeout:20}));
const json=(data:any,status=200)=>Response.json(data,{status,headers:{'cache-control':'no-store'}});
export async function moveFolder(q:any,id:string,parentId:string|null,projectId?:string|null){
 await q`select pg_advisory_xact_lock(730041)`;
 const folders=await q`select id,parent_folder_id,project_id from scotty_folders for update`;
 const source=folders.find((f:any)=>f.id===id);if(!source)throw Error('Folder not found.');
 assertFolderMove(id,parentId,folders);
 const parent=parentId?folders.find((f:any)=>f.id===parentId):null;
 const project=parent?parent.project_id:projectId===undefined?source.project_id:projectId;
 if(project&&!(await q`select id from scotty_projects where id=${project}`).length)throw Error('Project not found.');
 const descendants=new Set<string>([id]);let changed=true;while(changed){changed=false;for(const f of folders)if(f.parent_folder_id&&descendants.has(f.parent_folder_id)&&!descendants.has(f.id)){descendants.add(f.id);changed=true;}}
 const ids=[...descendants];await q`update scotty_folders set project_id=${project||null},updated_at=now() where id=any(${ids})`;
 await q`update scotty_folders set parent_folder_id=${parentId},updated_at=now() where id=${id}`;
 await q`update scotty_files set project_id=${project||null},updated_at=now() where folder_id=any(${ids})`;
 return {id,parentFolderId:parentId,projectId:project||null};
}
export async function handleFolders(req:Request,u:URL){try{
 await bootstrapResources();const q=db(),path=u.pathname.replace('/api/folders','');
 if(req.method==='GET'&&path==='/sources'){
  const provider=u.searchParams.get('provider');if(provider!=='googledocs'&&provider!=='appleplanner')throw Error('Choose Google Docs or Apple Calendar.');
  const data=await addonRead(provider,provider==='googledocs'?'documents':'snapshot');return json({ok:true,provider,data,checkedAt:new Date().toISOString()});
 }
 if(req.method==='GET'&&path==='')return json({ok:true,folders:await q`select id,name,project_id as "projectId",parent_folder_id as "parentFolderId" from scotty_folders order by name`,projects:await q`select id,name from scotty_projects order by name`,files:await q`select id,name,project_id as "projectId",folder_id as "folderId",path,mime_type as "mimeType",metadata from scotty_files order by updated_at desc limit 1000`,fileLimit:1000});
 if(req.method!=='POST')return json({ok:false,error:'Folder route not found'},404);
 const b=await req.json();const result=await q.begin(async(t:any)=>{
  await t`select pg_advisory_xact_lock(730041)`;
  if(path==='/create'){
   const name=folderName(b.name),parentId=b.parentFolderId?String(b.parentFolderId):null;let projectId=b.projectId?String(b.projectId):null;
   if(parentId){const p=(await t`select project_id from scotty_folders where id=${parentId}`)[0];if(!p)throw Error('Parent folder not found.');projectId=p.project_id;}
   if(projectId&&!(await t`select id from scotty_projects where id=${projectId}`).length)throw Error('Project not found.');
   const existing=await t`select id from scotty_folders where lower(name)=lower(${name}) and project_id is not distinct from ${projectId} and parent_folder_id is not distinct from ${parentId}`;
   if(existing.length)throw Error('A folder with that name already exists here.');
   const id='folder-'+crypto.randomUUID();await t`insert into scotty_folders(id,name,project_id,parent_folder_id) values(${id},${name},${projectId},${parentId})`;return {id,name};
  }
  if(path==='/move')return moveFolder(t,String(b.id),b.parentFolderId?String(b.parentFolderId):null,b.projectId===undefined?undefined:b.projectId||null);
  if(path==='/rename'){
   const name=folderName(b.name),id=String(b.id);const f=(await t`select * from scotty_folders where id=${id}`)[0];if(!f)throw Error('Folder not found.');
   if((await t`select id from scotty_folders where id<>${id} and lower(name)=lower(${name}) and project_id is not distinct from ${f.project_id} and parent_folder_id is not distinct from ${f.parent_folder_id}`).length)throw Error('A folder with that name already exists here.');
   await t`update scotty_folders set name=${name},updated_at=now() where id=${id}`;return {id,name};
  }
  const folder=(await t`select id,project_id from scotty_folders where id=${String(b.folderId||'')}`)[0];if(!folder)throw Error('Choose an existing destination folder.');
  if(path==='/file-move'){
   const rows=await t`update scotty_files set folder_id=${folder.id},project_id=${folder.project_id},updated_at=now() where id=${String(b.id)} returning id`;if(!rows.length)throw Error('Saved file not found. Import it first.');return {id:rows[0].id};
  }
  if(path==='/reference'){
   let metadata:any,pathValue='',mime='application/x-scotty-reference',name=folderName(b.name);
   if(b.type==='google-doc'){const doc=googleDocumentURL(b.url);pathValue=doc.url;metadata={source:'google-doc',documentId:doc.id,reference:true};}
   else if(b.type==='apple-event'){
    if(b.eventId){const data=await addonRead('appleplanner','snapshot');const matches=(data.devices||[]).filter((d:any)=>!b.deviceId||d.id===b.deviceId).flatMap((d:any)=>(d.snapshot?.events||[]).filter((e:any)=>e.id===b.eventId).map((e:any)=>({...e,deviceId:d.id,lastSeen:d.last_seen})));if(matches.length!==1)throw Error('Choose one event from the Apple Calendar bridge results.');metadata={source:'apple-calendar',reference:true,event:matches[0],snapshotAt:new Date().toISOString()};name=String(matches[0].title||name).slice(0,240);}
    else {if(![b.start,b.end].every(v=>typeof v==='string'&&/T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(v)))throw Error('Use ISO event times including a timezone offset.');const start=new Date(b.start),end=new Date(b.end);if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<=start)throw Error('Enter valid event start and end times with timezone offsets.');metadata={source:'apple-calendar',reference:true,manual:true,event:{title:name,start:start.toISOString(),end:end.toISOString(),calendar:String(b.calendar||'').slice(0,240)},snapshotAt:new Date().toISOString()};}
    mime='application/x-scotty-calendar-event';
   }else throw Error('Choose Google Doc or Apple Calendar event.');
   const id='file-'+crypto.randomUUID();await t`insert into scotty_files(id,name,path,project_id,folder_id,mime_type,metadata) values(${id},${name},${pathValue},${folder.project_id},${folder.id},${mime},${t.json(metadata)})`;return {id,name,reference:true};
  }
  throw Error('Folder operation not found.');
 });return json({ok:true,...result});
}catch(e:any){return json({ok:false,error:String(e.message||'Folder request failed')},400)}}
