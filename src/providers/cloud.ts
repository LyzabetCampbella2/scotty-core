import postgres from "postgres";
import { getGoogleAccessToken,connectionStatus } from "../connections/cloud.ts";

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
 })();
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
  {id:"telegram",label:"Telegram",configured:Boolean(env.TELEGRAM_BOT_TOKEN),operations:["send_message"]},
  {id:"google",label:"Google",configured:Boolean(googleConnection?.configured||env.GOOGLE_ACCESS_TOKEN),accountEmail:googleConnection?.accountEmail||null,operations:["gmail_send","calendar_create","drive_create_text"],connectionMode:googleConnection?.configured?"oauth":"legacy_or_unconnected"},
  {id:"github",label:"GitHub",configured:Boolean(env.SCOTTY_GITHUB_TOKEN||env.GITHUB_TOKEN),operations:["create_issue","comment_issue"]},
  {id:"slack",label:"Slack",configured:Boolean(env.SLACK_BOT_TOKEN),operations:["send_message"]},
  {id:"dropbox",label:"Dropbox",configured:Boolean(env.DROPBOX_ACCESS_TOKEN),operations:["upload_text"]},
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
 if(!r.ok)throw new Error(String(d?.error?.message||d?.description||d?.message||d?.error||("HTTP "+r.status)));
 return d;
}
async function telegram(op:string,p:any){
 if(op!=="send_message")throw new Error("Unsupported Telegram operation");
 const token=process.env.TELEGRAM_BOT_TOKEN;if(!token)throw new Error("Telegram is not connected");
 const chatId=String(p.chatId||p.chat_id||process.env.TELEGRAM_DEFAULT_CHAT_ID||"").trim();
 const text=String(p.text||p.message||"").trim();if(!chatId||!text)throw new Error("Telegram chatId and text are required");
 const d=await fetchJson(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:chatId,text})});
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
  const to=String(p.to||"").trim(),subject=String(p.subject||"").trim(),body=String(p.body||p.text||"").trim();
  if(!to||!subject||!body)throw new Error("Gmail to, subject, and body are required");
  const raw=`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${body}`;
  const d=await fetchJson("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers,body:JSON.stringify({raw:b64url(raw)})});
  return {id:d.id,threadId:d.threadId};
 }
 if(op==="calendar_create"){
  const summary=String(p.summary||p.title||"").trim(),start=String(p.start||"").trim(),end=String(p.end||"").trim();
  if(!summary||!start||!end)throw new Error("Calendar summary, start, and end are required");
  const event:any={summary,description:String(p.description||""),start:{dateTime:start},end:{dateTime:end}};
  if(p.timeZone){event.start.timeZone=String(p.timeZone);event.end.timeZone=String(p.timeZone)}
  const d=await fetchJson("https://www.googleapis.com/calendar/v3/calendars/primary/events",{method:"POST",headers,body:JSON.stringify(event)});
  return {id:d.id,url:d.htmlLink,summary:d.summary};
 }
 if(op==="drive_create_text"){
  const name=String(p.name||"SCOTTY note.txt").trim(),text=String(p.text||p.content||"");
  if(!name)throw new Error("Drive file name is required");
  const boundary="scotty_"+crypto.randomUUID().replaceAll("-","");
  const metadata=JSON.stringify({name,mimeType:"text/plain"});
  const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${text}\r\n--${boundary}--`;
  const r=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",{method:"POST",headers:{authorization:"Bearer "+token,"content-type":"multipart/related; boundary="+boundary},body,signal:AbortSignal.timeout(20000)});
  const d:any=await r.json().catch(()=>({}));if(!r.ok)throw new Error(String(d?.error?.message||"Drive upload failed"));
  return {id:d.id,name:d.name||name};
 }
 throw new Error("Unsupported Google operation");
}
async function slack(op:string,p:any){
 if(op!=="send_message")throw new Error("Unsupported Slack operation");
 const token=process.env.SLACK_BOT_TOKEN;if(!token)throw new Error("Slack is not connected");
 const channel=String(p.channel||process.env.SLACK_DEFAULT_CHANNEL||"").trim(),text=String(p.text||p.message||"").trim();
 if(!channel||!text)throw new Error("Slack channel and text are required");
 const d=await fetchJson("https://slack.com/api/chat.postMessage",{method:"POST",headers:{authorization:"Bearer "+token,"content-type":"application/json"},body:JSON.stringify({channel,text})});
 if(!d.ok)throw new Error(String(d.error||"Slack send failed"));
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
async function facebook(op:string,p:any){
 if(op!=="create_post")throw new Error("Unsupported Facebook operation");
 const token=process.env.META_ACCESS_TOKEN,page=process.env.FACEBOOK_PAGE_ID;if(!token||!page)throw new Error("Facebook is not connected");
 const message=String(p.message||p.text||"").trim();if(!message)throw new Error("Facebook post text is required");
 const form=new URLSearchParams({message,access_token:token});
 const d=await fetchJson(`https://graph.facebook.com/v20.0/${page}/feed`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form});
 return {id:d.id};
}
async function instagram(op:string,p:any){
 if(op!=="publish_image")throw new Error("Unsupported Instagram operation");
 const token=process.env.META_ACCESS_TOKEN,account=process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;if(!token||!account)throw new Error("Instagram is not connected");
 const imageUrl=String(p.imageUrl||p.image_url||"").trim(),caption=String(p.caption||p.text||"");
 if(!/^https:\/\//i.test(imageUrl))throw new Error("Instagram imageUrl must be a public HTTPS URL");
 const create=new URLSearchParams({image_url:imageUrl,caption,access_token:token});
 const d=await fetchJson(`https://graph.facebook.com/v20.0/${account}/media`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:create});
 const pub=new URLSearchParams({creation_id:String(d.id),access_token:token});
 const x=await fetchJson(`https://graph.facebook.com/v20.0/${account}/media_publish`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:pub});
 return {id:x.id,creationId:d.id};
}
export async function executeProviderAction(input:any){
 await ensure();
 const provider=String(input?.provider||"").toLowerCase(),operation=String(input?.operation||"").toLowerCase(),payload=input?.payload&&typeof input.payload==="object"?input.payload:{};
 const id=crypto.randomUUID(),missionId=input?.missionId||null,stepId=input?.stepId||null;
 let result:any;
 try{
  if(provider==="telegram")result=await telegram(operation,payload);
  else if(provider==="github")result=await github(operation,payload);
  else if(provider==="google")result=await google(operation,payload);
  else if(provider==="slack")result=await slack(operation,payload);
  else if(provider==="dropbox")result=await dropbox(operation,payload);
  else if(provider==="facebook")result=await facebook(operation,payload);
  else if(provider==="instagram")result=await instagram(operation,payload);
  else if(provider==="tiktok")throw new Error("TikTok posting is not enabled until Content Posting OAuth is connected");
  else throw new Error("Unknown provider: "+provider);
  await db()`insert into scotty_action_receipts(id,mission_id,step_id,provider,operation,status,request_summary,response_summary)
    values(${id},${missionId},${stepId},${provider},${operation},'completed',${db().json(clean(payload))},${db().json(clean(result))})`;
  return {ok:true,id,provider,operation,result};
 }catch(e:any){
  const error=String(e?.message||"Provider action failed").slice(0,3000);
  await db()`insert into scotty_action_receipts(id,mission_id,step_id,provider,operation,status,request_summary,error)
    values(${id},${missionId},${stepId},${provider},${operation},'error',${db().json(clean(payload))},${error})`;
  return {ok:false,id,provider,operation,error};
 }
}
export async function providerStatus(){
 await ensure();
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
