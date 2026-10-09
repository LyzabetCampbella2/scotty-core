import postgres from "postgres";

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
  await q`create table if not exists scotty_connections(
    provider text primary key,
    status text not null default 'disconnected',
    account_email text,
    scopes jsonb not null default '[]'::jsonb,
    encrypted_token text,
    token_expires_at timestamptz,
    refresh_capable boolean not null default false,
    metadata jsonb not null default '{}'::jsonb,
    connected_at timestamptz,
    updated_at timestamptz not null default now()
  )`;
  await q`create table if not exists scotty_oauth_states(
    state_hash text primary key,
    provider text not null,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
  )`;
  await q`create index if not exists scotty_oauth_states_expiry_idx on scotty_oauth_states(expires_at)`;
 })();
 return initPromise;
}
const PUBLIC_URL=()=>String(process.env.SCOTTY_PUBLIC_URL||"https://scotty-cloud-hud.vercel.app").replace(/\/$/,"");
export const googleRedirectUri=()=>PUBLIC_URL()+"/api/connections/google/callback";
const googleScopes=[
 "openid",
 "email",
 "profile",
 "https://www.googleapis.com/auth/gmail.send",
 "https://www.googleapis.com/auth/calendar.events",
 "https://www.googleapis.com/auth/drive.file"
];

function bytesToB64(bytes:Uint8Array){
 let bin="";for(const b of bytes)bin+=String.fromCharCode(b);
 return btoa(bin);
}
function b64ToBytes(s:string){
 const bin=atob(s);const out=new Uint8Array(bin.length);
 for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
 return out;
}
async function hash(s:string){
 const raw=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
 return [...new Uint8Array(raw)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function vaultKey(){
 const secret=process.env.SCOTTY_CONNECTION_KEY;
 if(!secret)throw new Error("SCOTTY_CONNECTION_KEY is not configured");
 const raw=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret));
 return crypto.subtle.importKey("raw",raw,"AES-GCM",false,["encrypt","decrypt"]);
}
async function seal(value:any){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await vaultKey();
 const plain=new TextEncoder().encode(JSON.stringify(value));
 const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain);
 return "v1."+bytesToB64(iv)+"."+bytesToB64(new Uint8Array(encrypted));
}
async function unseal(value:string){
 const parts=String(value||"").split(".");
 if(parts.length!==3||parts[0]!=="v1")throw new Error("Unsupported connection token format");
 const key=await vaultKey(),iv=b64ToBytes(parts[1]),data=b64ToBytes(parts[2]);
 const raw=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,data);
 return JSON.parse(new TextDecoder().decode(raw));
}
function setup(){
 return {
  publicUrl:PUBLIC_URL(),
  redirectUri:googleRedirectUri(),
  vaultConfigured:Boolean(process.env.SCOTTY_CONNECTION_KEY),
  googleClientConfigured:Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID&&process.env.GOOGLE_OAUTH_CLIENT_SECRET)
 };
}
async function row(provider:string){
 await ensure();
 const r=await db()`select provider,status,account_email as "accountEmail",scopes,token_expires_at as "tokenExpiresAt",refresh_capable as "refreshCapable",metadata,connected_at as "connectedAt",updated_at as "updatedAt" from scotty_connections where provider=${provider} limit 1`;
 return r?.[0]||null;
}
export async function connectionStatus(){
 await ensure();
 const google=await row("google");
 const cfg=setup();
 return {
  setup:cfg,
  connections:{
   google:google?{...google,configured:google.status==="connected",needsReconnect:google.status!=="connected"}:{provider:"google",status:"disconnected",configured:false,needsReconnect:false,accountEmail:null,scopes:[],refreshCapable:false,connectedAt:null,updatedAt:null}
  }
 };
}
async function googleTokenRequest(params:Record<string,string>){
 const id=process.env.GOOGLE_OAUTH_CLIENT_ID,secret=process.env.GOOGLE_OAUTH_CLIENT_SECRET;
 if(!id||!secret)throw new Error("Google OAuth client is not configured");
 const r=await fetch("https://oauth2.googleapis.com/token",{
  method:"POST",
  headers:{"content-type":"application/x-www-form-urlencoded"},
  body:new URLSearchParams({...params,client_id:id,client_secret:secret}),
  signal:AbortSignal.timeout(20000)
 });
 const d:any=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(String(d?.error_description||d?.error||"Google token exchange failed"));
 return d;
}
async function googleUser(accessToken:string){
 const r=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{authorization:"Bearer "+accessToken},signal:AbortSignal.timeout(15000)});
 const d:any=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(String(d?.error_description||d?.error||"Google profile lookup failed"));
 return d;
}
async function startGoogle(){
 await ensure();
 const cfg=setup();
 if(!cfg.vaultConfigured)throw new Error("Connection Vault is not configured");
 if(!cfg.googleClientConfigured)throw new Error("Google OAuth client is not configured");
 const state=crypto.randomUUID().replaceAll("-","")+crypto.randomUUID().replaceAll("-","");
 const stateHash=await hash(state);
 await db()`delete from scotty_oauth_states where expires_at<=now() or used_at is not null`;
 await db()`insert into scotty_oauth_states(state_hash,provider,expires_at) values(${stateHash},'google',now()+interval '10 minutes')`;
 const q=new URLSearchParams({
  client_id:String(process.env.GOOGLE_OAUTH_CLIENT_ID),
  redirect_uri:googleRedirectUri(),
  response_type:"code",
  scope:googleScopes.join(" "),
  access_type:"offline",
  prompt:"consent",
  include_granted_scopes:"true",
  state
 });
 return "https://accounts.google.com/o/oauth2/v2/auth?"+q.toString();
}
async function callbackGoogle(u:URL){
 await ensure();
 const error=u.searchParams.get("error");
 if(error)throw new Error("Google connection was not approved");
 const code=String(u.searchParams.get("code")||""),state=String(u.searchParams.get("state")||"");
 if(!code||!state)throw new Error("Google callback is missing code or state");
 const stateHash=await hash(state);
 const rows=await db()`select state_hash from scotty_oauth_states where state_hash=${stateHash} and provider='google' and used_at is null and expires_at>now() limit 1`;
 if(!rows.length)throw new Error("Google connection state expired or invalid");
 await db()`update scotty_oauth_states set used_at=now() where state_hash=${stateHash}`;
 const token=await googleTokenRequest({code,grant_type:"authorization_code",redirect_uri:googleRedirectUri()});
 if(!token?.access_token)throw new Error("Google did not return an access token");
 let refreshToken=String(token.refresh_token||"");
 if(!refreshToken){
  const existing=await db()`select encrypted_token as "encryptedToken" from scotty_connections where provider='google' limit 1`;
  if(existing?.[0]?.encryptedToken){
   try{const old=await unseal(existing[0].encryptedToken);refreshToken=String(old?.refresh_token||"")}catch{}
  }
 }
 const user=await googleUser(String(token.access_token));
 const expiresAt=new Date(Date.now()+Math.max(60,Number(token.expires_in||3600))*1000);
 const sealed=await seal({access_token:String(token.access_token),refresh_token:refreshToken,token_type:String(token.token_type||"Bearer")});
 const scopes=String(token.scope||googleScopes.join(" ")).split(/\s+/).filter(Boolean);
 await db()`insert into scotty_connections(provider,status,account_email,scopes,encrypted_token,token_expires_at,refresh_capable,metadata,connected_at,updated_at)
  values('google','connected',${user?.email?String(user.email):null},${db().json(scopes)},${sealed},${expiresAt},${Boolean(refreshToken)},${db().json({sub:user?.sub||null,name:user?.name||null,picture:user?.picture||null})},now(),now())
  on conflict(provider) do update set status='connected',account_email=excluded.account_email,scopes=excluded.scopes,encrypted_token=excluded.encrypted_token,token_expires_at=excluded.token_expires_at,refresh_capable=excluded.refresh_capable,metadata=excluded.metadata,connected_at=coalesce(scotty_connections.connected_at,now()),updated_at=now()`;
 return {email:user?.email||null};
}
export async function getGoogleAccessToken(){
 await ensure();
 const rows=await db()`select status,encrypted_token as "encryptedToken",token_expires_at as "tokenExpiresAt" from scotty_connections where provider='google' limit 1`;
 const c=rows?.[0];
 if(c?.status!=="connected"||!c?.encryptedToken){
  const legacy=process.env.GOOGLE_ACCESS_TOKEN;
  if(legacy)return String(legacy);
  throw new Error("Google is not connected");
 }
 let token=await unseal(c.encryptedToken);
 const expires=c.tokenExpiresAt?new Date(c.tokenExpiresAt).getTime():0;
 if(token?.access_token&&expires>Date.now()+120000)return String(token.access_token);
 const refresh=String(token?.refresh_token||"");
 if(!refresh){
  await db()`update scotty_connections set status='needs_reconnect',updated_at=now() where provider='google'`;
  throw new Error("Google connection needs to be reconnected");
 }
 const next=await googleTokenRequest({refresh_token:refresh,grant_type:"refresh_token"});
 if(!next?.access_token)throw new Error("Google token refresh failed");
 token={...token,access_token:String(next.access_token),token_type:String(next.token_type||token.token_type||"Bearer")};
 const sealed=await seal(token),expiresAt=new Date(Date.now()+Math.max(60,Number(next.expires_in||3600))*1000);
 await db()`update scotty_connections set status='connected',encrypted_token=${sealed},token_expires_at=${expiresAt},updated_at=now() where provider='google'`;
 return String(token.access_token);
}
async function disconnectGoogle(){
 await ensure();
 const rows=await db()`select encrypted_token as "encryptedToken" from scotty_connections where provider='google' limit 1`;
 if(rows?.[0]?.encryptedToken){
  try{
   const t=await unseal(rows[0].encryptedToken);
   const revoke=String(t?.refresh_token||t?.access_token||"");
   if(revoke)await fetch("https://oauth2.googleapis.com/revoke",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({token:revoke}),signal:AbortSignal.timeout(10000)});
  }catch{}
 }
 await db()`delete from scotty_connections where provider='google'`;
 return {ok:true};
}
export async function handleCloudConnections(req:Request,u:URL){
 await ensure();
 const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{"cache-control":"no-store",...headers}});
 if(req.method==="GET"&&u.pathname==="/api/connections")return json({ok:true,...await connectionStatus()});
 if(req.method==="GET"&&u.pathname==="/api/connections/google/start"){
  try{return new Response(null,{status:302,headers:{location:await startGoogle(),"cache-control":"no-store"}})}
  catch(e:any){return json({ok:false,error:String(e?.message||"Unable to start Google connection"),setup:setup()},503)}
 }
 if(req.method==="GET"&&u.pathname==="/api/connections/google/callback"){
  try{
   const r=await callbackGoogle(u);
   return new Response(null,{status:302,headers:{location:PUBLIC_URL()+"/integrations?google=connected","cache-control":"no-store"}});
  }catch(e:any){
   const msg=encodeURIComponent(String(e?.message||"Google connection failed").slice(0,300));
   return new Response(null,{status:302,headers:{location:PUBLIC_URL()+"/integrations?google=error&message="+msg,"cache-control":"no-store"}});
  }
 }
 if(req.method==="POST"&&u.pathname==="/api/connections/google/disconnect"){
  await disconnectGoogle();return json({ok:true,provider:"google",status:"disconnected"});
 }
 return json({ok:false,error:"Connection route not found"},404);
}
