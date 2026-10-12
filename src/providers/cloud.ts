import postgres from "postgres";
import { getGoogleAccessToken,connectionStatus } from "../connections/cloud.ts";
import {executeAttachment} from './artifacts.ts';
import {email,header,redact} from './apps-model.ts';

let sql:any=null,initPromise:Promise<void>|null=null;
function db(){
 if(!sql){
  const url=process.env.DATABASE_URL;
  if(!url)throw new Error("DATABASE_URL missing");
  sql=postgres(url,{max:4,idle_timeout:20,connect_timeout:12,ssl:"require"});
 }
 return sql;
}
async function ensure(){
 if(initPromise)return initPromise;
 initPromise=(async()=>{
  const q=db();
  await q`create table if not exists scotty_action_receipts(
    id uuid primary key,
    mission_id uuid,
    step_id uuid,
    provider text not null,
    operation text not null,
    status text not null,
    request_summary jsonb not null default '{}'::jsonb,
    response_summary jsonb not null default '{}'::jsonb,
    error text,
    created_at timestamptz not null default now()
  )`;
  await q`create index if not exists scotty_action_receipts_created_idx on scotty_action_receipts(created_at desc)`;
  await q`alter table scotty_action_receipts add column if not exists request_key text`;
  await q`create unique index if not exists scotty_receipt_request_key on scotty_action_receipts(request_key) where request_key is not null`;
 })().catch(e=>{initPromise=null;throw e});
 return initPromise;
}
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"cache-control":"no-store"}});

function b64url(s:string){
 const bytes=new TextEncoder().encode(s);
 let bin="";for(const b of bytes)bin+=String.fromCharCode(b);
 return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
async function providerInfo(){
 const env=process.env;
 let googleConnection:any=null;
 try{googleConnection=(await connectionStatus()).connections.google}catch{}
 return [
  {id:"telegram",label:"Telegram",configured:Boolean(env.TELEGRAM_BOT_TOKEN),operations:["send_message","send_document"]},
  {id:"google",label:"Google",configured:Boolean(googleConnection?.configured||env.GOOGLE_ACCESS_TOKEN),accountEmail:googleConnection?.accountEmail||null,operations:["gmail_send","gmail_send_attachment","calendar_create","calendar_update","drive_create_text","drive_upload"],connectionMode:googleConnection?.configured?"oauth":"legacy_or_unconnected"},
  {id:"github",label:"GitHub",configured:Boolean(env.SCOTTY_GITHUB_TOKEN||env.GITHUB_TOKEN),operations:["create_issue","comment_issue"]},
  {id:"slack",label:"Slack",configured:Boolean(env.SLACK_BOT_TOKEN),operations:["send_message"]},
  {id:"dropbox",label:"Dropbox",configured:Boolean(env.DROPBOX_ACCESS_TOKEN),operations:["upload_text","upload_file"]},
  {id:"facebook",label:"Facebook",configured:Boolean(env.META_ACCESS_TOKEN&&env.FACEBOOK_PAGE_ID),operations:["create_post"]},
  {id:"instagram",label:"Instagram",configured:Boolean(env.META_ACCESS_TOKEN&&env.INSTAGRAM_BUSINESS_ACCOUNT_ID),operations:["publish_image"]},
  {id:"tiktok",label:"TikTok",configured:Boolean(env.TIKTOK_ACCESS_TOKEN),operations:["status_only"],note:"Posting adapter requires TikTok Content Posting authorization and is not auto-enabled."}
 ];
}
function clean(obj:any){
 if(!obj||typeof obj!=="object")return {};
 const out:any={};
 for(const [k,v] of Object.entries(obj)){
  if(/token|secret|password|authorization/i.test(k))continue;
  if(typeof v==="string")out[k]=v.length>500?v.slice(0,500)+"…":v;
  else if(["number","boolean"].includes(typeof v)||v==null)out[k]=v;
  else if(Array.isArray(v))out[k]=v.slice(0,10);
  else if(typeof v==="object")out[k]=clean(v);
 }
 return out;
}
async function fetchJson(url:string,init:RequestInit,timeout=20000){
 const r=await fetch(url,{...init,signal:AbortSignal.timeout(timeout)});
 const text=await r.text();let d:any={};try{d=text?JSON.parse(text):{}}catch{d={text:text.slice(0,2000)}}
 if(!r.ok){const e:any=new Error(String(d?.error?.message||d?.description||d?.message||d?.error||("HTTP "+r.status)));e.definitive=r.status>=400&&r.status<500;throw e}
 return d;
}
async function telegram(op:string,p:any){
 if(op!=="send_message")throw new Error("Unsupported Telegram operation");
 const token=process.env.TELEGRAM_BOT_TOKEN;if(!token)throw new Error("Telegram is not connected");
 const chatId=String(p.chatId||p.chat_id||process.env.TELEGRAM_DEFAULT_CHAT_ID||"").trim();
 const text=String(p.text||p.message||"").trim();if(!chatId||!text)throw new Error("Telegram chatId and text are required");
 const d=await fetchJson(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:chatId,text})});
 if(d.ok!==true||d.result?.message_id==null){const e:any=Error(String(d.description||'Telegram did not confirm sending.'));e.definitive=d.ok===false;throw e}
 return {messageId:d?.result?.message_id||null,chatId:d?.result?.chat?.id||chatId};
}
async function github(op:string,p:any){
 const token=process.env.SCOTTY_GITHUB_TOKEN||process.env.GITHUB_TOKEN;if(!token)throw new Error("GitHub is not connected");
 const repo=String(p.repo||process.env.SCOTTY_GITHUB_REPO||"").trim();if(!repo.includes("/"))throw new Error("GitHub repo must be owner/name");
 const headers={authorization:"Bearer "+token,accept:"application/vnd.github+json","content-type":"application/json","x-github-api-version":"2022-11-28"};
 if(op==="create_issue"){
  const title=String(p.title||"").trim(),body=String(p.body||p.text||"").trim();if(!title)throw new Error("GitHub issue title is required");
  const d=await fetchJson(`https://api.github.com/repos/${repo}/issues`,{method:"POST",headers,body:JSON.stringify({title,body})});
  return {number:d.number,url:d.html_url,title:d.title};
 }
 if(op==="comment_issue"){
  const issue=Number(p.issue||p.issueNumber||0),body=String(p.body||p.text||"").trim();if(!issue||!body)throw new Error("GitHub issue number and comment body are required");
  const d=await fetchJson(`https://api.github.com/repos/${repo}/issues/${issue}/comments`,{method:"POST",headers,body:JSON.stringify({body})});
  return {id:d.id,url:d.html_url};
 }
 throw new Error("Unsupported GitHub operation");
}
async function google(op:string,p:any){
 const token=await getGoogleAccessToken();
 const headers={authorization:"Bearer "+token,"content-type":"application/json"};
 if(op==="gmail_send"){
  const to=email(p.to),subject=header(p.subject),body=String(p.body||p.text||"").trim();
  if(!to||!subject||!body)throw new Error("Gmail to, subject, and body are required");
  const raw=`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${body}`;
  const d=await fetchJson("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers,body:JSON.stringify({raw:b64url(raw)})});
  return {id:d.id,threadId:d.threadId};
 }
 if(op==="calendar_create"||op==="calendar_update"){
  const summary=String(p.summary||p.title||"").trim(),start=String(p.start||"").trim(),end=String(p.end||"").trim();
  if(!summary||!start||!end)throw new Error("Calendar summary, start, and end are required");
  const event:any={summary,description:String(p.description||""),start:{dateTime:start},end:{dateTime:end}};
  if(p.timeZone){event.start.timeZone=String(p.timeZone);event.end.timeZone=String(p.timeZone)}
  const base="https://www.googleapis.com/calendar/v3/calendars/primary/events";
  let d:any;
  if(op==="calendar_update"||p.requestId){
   const id=String(op==="calendar_update"?p.eventId:p.requestId||"");
   if(!/^[a-zA-Z0-9_-]{5,1024}$/.test(id))throw Error("Invalid calendar event ID");
   if(op==="calendar_create")event.id=id;
   const r=await fetch(op==="calendar_update"?base+"/"+encodeURIComponent(id):base,{method:op==="calendar_update"?"PATCH":"POST",headers:{...headers,...(op==="calendar_update"&&p.etag?{"If-Match":String(p.etag)}:{})},body:JSON.stringify(event),signal:AbortSignal.timeout(20000)});
   d=await r.json().catch(()=>({}));
   if(!r.ok){
    if((op==="calendar_create"&&r.status===409)||(op==="calendar_update"&&r.status===412)){
     const old=await fetchJson(base+"/"+encodeURIComponent(id),{method:"GET",headers});
     if(old.summary===summary&&String(old.description||"")===event.description&&new Date(old.start?.dateTime).getTime()===new Date(start).getTime()&&new Date(old.end?.dateTime).getTime()===new Date(end).getTime())d=old;
     else throw Error("Calendar event changed. Make a fresh preview before trying again.");
    }else throw Error(String(d?.error?.message||"Calendar action failed"));
   }
  }else d=await fetchJson(base,{method:"POST",headers,body:JSON.stringify(event)});
  return {id:d.id,url:d.htmlLink,summary:d.summary};
 }
 if(op==="drive_create_text"){
  const name=String(p.name||"SCOTTY note.txt").trim(),text=String(p.text||p.content||"");
  if(!name)throw new Error("Drive file name is required");
  const boundary="scotty_"+crypto.randomUUID().replaceAll("-","");
  const metadata=JSON.stringify({name,mimeType:"text/plain"});
  const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${text}\r\n--${boundary}--`;
  const r=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",{method:"POST",headers:{authorization:"Bearer "+token,"content-type":"multipart/related; boundary="+boundary},body,signal:AbortSignal.timeout(20000)});
  const d:any=await r.json().catch(()=>({}));if(!r.ok)throw new Error(String(d?.error?.message||"Drive upload failed"));
  return {id:d.id,name:d.name||name,webViewLink:d.webViewLink||null};
 }
 throw new Error("Unsupported Google operation");
}
async function slack(op:string,p:any){
 if(op!=="send_message")throw new Error("Unsupported Slack operation");
 const token=process.env.SLACK_BOT_TOKEN;if(!token)throw new Error("Slack is not connected");
 const channel=String(p.channel||process.env.SLACK_DEFAULT_CHANNEL||"").trim(),text=String(p.text||p.message||"").trim();
 if(!channel||!text)throw new Error("Slack channel and text are required");
 const d=await fetchJson("https://slack.com/api/chat.postMessage",{method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json"},body:JSON.stringify({channel,text})});
 if(!d.ok){const e:any=Error(String(d.error||"Slack send failed"));e.definitive=true;throw e}
 return {channel:d.channel,ts:d.ts};
}
async function dropbox(op:string,p:any){
 if(op!=="upload_text")throw new Error("Unsupported Dropbox operation");
 const token=process.env.DROPBOX_ACCESS_TOKEN;if(!token)throw new Error("Dropbox is not connected");
 const path=String(p.path||"/SCOTTY/note.txt").trim(),text=String(p.text||p.content||"");
 const r=await fetch("https://content.dropboxapi.com/2/files/upload",{method:"POST",headers:{authorization:"Bearer "+token,"Dropbox-API-Arg":JSON.stringify({path,mode:"add",autorename:true,mute:false}),"content-type":"application/octet-stream"},body:text,signal:AbortSignal.timeout(20000)});
 const d:any=await r.json().catch(()=>({}));if(!r.ok)throw new Error(String(d?.error_summary||"Dropbox upload failed"));
 return {id:d.id,path:d.path_display||path,name:d.name};
}
export const metaVersion=()=>/^v\d+\.0$/.test(process.env.META_GRAPH_API_VERSION||'')?process.env.META_GRAPH_API_VERSION:'v24.0';
async function facebook(op:string,p:any){
 if(op!=="create_post")throw new Error("Unsupported Facebook operation");
 const token=process.env.META_ACCESS_TOKEN,page=process.env.FACEBOOK_PAGE_ID;if(!token||!page)throw new Error("Facebook is not connected");
 if(p.pageId&&String(p.pageId)!==page)throw Error("Facebook Page destination changed. Make a fresh preview.");
 const message=String(p.message||p.text||"").trim();if(!message)throw new Error("Facebook post text is required");
 const form=new URLSearchParams({message,access_token:token});
 const d=await fetchJson(`https://graph.facebook.com/${metaVersion()}/${page}/feed`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form});
 return {id:d.id};
}
async function instagram(op:string,p:any){
 if(op!=="publish_image")throw new Error("Unsupported Instagram operation");
 const token=process.env.META_ACCESS_TOKEN,account=process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;if(!token||!account)throw new Error("Instagram is not connected");
 if(p.accountId&&String(p.accountId)!==account)throw Error("Instagram destination changed. Make a fresh preview.");
 const imageUrl=String(p.imageUrl||p.image_url||"").trim(),caption=String(p.caption||p.text||"");
 if(!/^https:\/\//i.test(imageUrl))throw new Error("Instagram imageUrl must be a public HTTPS URL");
 const create=new URLSearchParams({image_url:imageUrl,caption,access_token:token});
 const d=await fetchJson(`https://graph.facebook.com/${metaVersion()}/${account}/media`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:create});
 const pub=new URLSearchParams({creation_id:String(d.id),access_token:token});
 const x=await fetchJson(`https://graph.facebook.com/${metaVersion()}/${account}/media_publish`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:pub});
 return {id:x.id,creationId:d.id};
}
export async function executeProviderAction(input:any){
 await ensure();
 const provider=String(input?.provider||"").toLowerCase(),operation=String(input?.operation||"").toLowerCase(),payload=input?.payload&&typeof input.payload==="object"?input.payload:{},id=crypto.randomUUID(),missionId=input?.missionId||null,stepId=input?.stepId||null;
 const key=provider+':'+operation+':'+String(input.requestId||payload.requestId||(missionId&&stepId?missionId+':'+stepId:id));
 const claimed=await db()`insert into scotty_action_receipts(id,mission_id,step_id,provider,operation,status,request_summary,request_key) values(${id},${missionId},${stepId},${provider},${operation},'processing',${db().json(redact(payload))},${key}) on conflict do nothing returning id`;
 if(!claimed.length){const old=(await db()`select * from scotty_action_receipts where request_key=${key}`)[0];return {ok:old.status==='completed',id:old.id,provider,operation,status:old.status,result:old.response_summary,error:old.status==='completed'?null:old.error||'This action was already attempted. Verify its provider state before preparing another preview.'}}
 let result:any;
 try{
  if(['gmail_send_attachment','drive_upload','upload_file','send_document'].includes(operation))result=await executeAttachment(provider,operation,payload,getGoogleAccessToken);
  else if(provider==="telegram")result=await telegram(operation,payload);
  else if(provider==="github")result=await github(operation,payload);
  else if(provider==="google")result=await google(operation,payload);
  else if(provider==="slack")result=await slack(operation,payload);
  else if(provider==="dropbox")result=await dropbox(operation,payload);
  else if(provider==="facebook")result=await facebook(operation,payload);
  else if(provider==="instagram")result=await instagram(operation,payload);
  else if(provider==="tiktok")throw new Error("TikTok posting is not enabled until Content Posting OAuth is connected");
  else throw new Error("Unknown provider: "+provider);
  if(!result?.id&&!result?.number&&!result?.messageId&&!result?.ts)throw Error('Provider did not return a confirmation identifier.');
 }catch(e:any){const error=String(e?.message||'Provider action failed').slice(0,3000),status=e?.definitive===true?'error':'unknown';await db()`update scotty_action_receipts set status=${status},error=${error} where id=${id}`;return {ok:false,id,provider,operation,status,error}}
 try{await db()`update scotty_action_receipts set status='completed',response_summary=${db().json(redact(result))},error=null where id=${id}`}
 catch{return {ok:true,id,provider,operation,result,status:'provider_confirmed_receipt_unsaved',warning:'Provider confirmed the action, but its durable receipt could not be saved. Do not repeat it.'}}
 return {ok:true,id,provider,operation,result,status:'completed'};
}
export async function providerStatus(){
 await ensure();
 await db()`update scotty_action_receipts set status='unknown',error='The provider outcome was not saved. Verify before attempting another action.' where status='processing' and created_at<now()-interval '3 minutes'`;
 const providers=await providerInfo();
 const receipts=await db()`select id,mission_id as "missionId",step_id as "stepId",provider,operation,status,response_summary as "responseSummary",error,created_at as "createdAt" from scotty_action_receipts order by created_at desc limit 30`;
 return {providers,receipts};
}
export async function handleCloudProviders(req:Request,u:URL){
 await ensure();
 if(req.method==="GET"&&u.pathname==="/api/providers")return json({ok:true,...await providerStatus()});
 if(req.method==="GET"&&u.pathname==="/api/providers/receipts"){
  const rows=await db()`select id,mission_id as "missionId",step_id as "stepId",provider,operation,status,response_summary as "responseSummary",error,created_at as "createdAt" from scotty_action_receipts order by created_at desc limit 100`;
  return json({ok:true,receipts:rows});
 }
 return json({ok:false,error:"Provider route not found"},404);
}
