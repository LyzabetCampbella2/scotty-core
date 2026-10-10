import postgres from "postgres";

let sql:any=null,initPromise:Promise<void>|null=null;
const failures=new Map<string,{count:number;until:number}>();

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
  await q`create table if not exists scotty_auth_owner(
    id integer primary key check(id=1),
    password_hash text not null,
    migrated_from text not null default 'native',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;
  await q`create table if not exists scotty_sessions(
    token_hash text primary key,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    expires_at timestamptz not null,
    user_agent text
  )`;
  await q`create index if not exists scotty_sessions_expiry_idx on scotty_sessions(expires_at)`;
 })();
 return initPromise;
}
function cookies(req:Request){
 const raw=req.headers.get("cookie")||"";
 const out:Record<string,string>={};
 for(const part of raw.split(";")){
  const i=part.indexOf("=");if(i<0)continue;
  const k=part.slice(0,i).trim(),v=part.slice(i+1).trim();
  if(k)out[k]=decodeURIComponent(v);
 }
 return out;
}
async function sha256(s:string){
 const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
 return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function clientKey(req:Request){
 return (req.headers.get("x-forwarded-for")||req.headers.get("cf-connecting-ip")||"unknown").split(",")[0].trim();
}
function blocked(req:Request){
 const k=clientKey(req),x=failures.get(k);
 if(!x)return false;
 if(Date.now()>x.until){failures.delete(k);return false}
 return x.count>=6;
}
function failed(req:Request){
 const k=clientKey(req),now=Date.now(),x=failures.get(k);
 failures.set(k,{count:(x&&now<x.until?x.count:0)+1,until:now+15*60*1000});
}
function cleared(req:Request){failures.delete(clientKey(req))}
async function owner(){
 await ensure();
 const r=await db()`select password_hash as "passwordHash",migrated_from as "migratedFrom" from scotty_auth_owner where id=1`;
 return r?.[0]||null;
}
async function validSession(req:Request){
 await ensure();
 const token=cookies(req).scotty_session;
 if(!token)return false;
 const h=await sha256(token);
 const r=await db()`select token_hash from scotty_sessions where token_hash=${h} and expires_at>now() limit 1`;
 if(!r.length)return false;
 await db()`update scotty_sessions set last_seen_at=now() where token_hash=${h}`;
 return true;
}
async function createSession(req:Request){
 const token=crypto.randomUUID().replaceAll("-","")+crypto.randomUUID().replaceAll("-","");
 const h=await sha256(token);
 await db()`delete from scotty_sessions where expires_at<=now()`;
 await db()`insert into scotty_sessions(token_hash,expires_at,user_agent) values(${h},now()+interval '30 days',${(req.headers.get("user-agent")||"").slice(0,500)})`;
 return `scotty_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}
async function verifyLegacy(password:string){
 const base=String(process.env.SCOTTY_LEGACY_API_URL||"").replace(/\/$/,"");
 if(!base)return false;
 try{
  const r=await fetch(base+"/api/auth/login",{
   method:"POST",
   headers:{"content-type":"application/json","accept":"application/json"},
   body:JSON.stringify({password}),
   redirect:"manual",
   signal:AbortSignal.timeout(20000)
  });
  if(!r.ok)return false;
  const t=await r.text();
  if(!t)return true;
  try{
   const j:any=JSON.parse(t);
   return j?.authenticated!==false && !j?.error;
  }catch{return true}
 }catch{return false}
}
async function writeOwner(password:string,source:string){
 const hash=await Bun.password.hash(password);
 await db()`insert into scotty_auth_owner(id,password_hash,migrated_from,updated_at)
  values(1,${hash},${source},now())
  on conflict(id) do update set password_hash=excluded.password_hash,migrated_from=excluded.migrated_from,updated_at=now()`;
}

export async function isCloudAuthenticated(req:Request){
 return validSession(req);
}

export async function handleCloudAuth(req:Request,u:URL){
 const json=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{"cache-control":"no-store",...headers}});
 await ensure();

 if(req.method==="GET"&&u.pathname==="/api/auth/status"){
  const authenticated=await validSession(req);
  const o=await owner();
  return json({ok:true,authenticated,needsSetup:false,migrationPending:!o,provider:"render-postgres"});
 }

 if(req.method==="POST"&&u.pathname==="/api/auth/login"){
  if(blocked(req))return json({ok:false,error:"Too many login attempts. Try again in about 15 minutes."},429);
  let body:any;try{body=await req.json()}catch{return json({ok:false,error:"Invalid JSON"},400)}
  const password=String(body?.password||"");
  if(password.length<1||password.length>512)return json({ok:false,error:"Invalid password"},400);
  let o=await owner(),ok=false,migrated=false;
  if(o){
   try{ok=await Bun.password.verify(password,o.passwordHash)}catch{ok=false}
  }else{
   ok=await verifyLegacy(password);
   if(ok){await writeOwner(password,"railway-first-login");migrated=true;o=await owner()}
  }
  if(!ok){if(o)failed(req);return json({ok:false,error:o?"Incorrect owner password.":"Owner migration is not yet verified. Use the original HUD while staging is configured."},o?401:503)}
  cleared(req);
  const cookie=await createSession(req);
  return json({ok:true,authenticated:true,migrated,provider:"render-postgres"},200,{"set-cookie":cookie});
 }

 if(req.method==="POST"&&u.pathname==="/api/auth/logout"){
  const token=cookies(req).scotty_session;
  if(token){const h=await sha256(token);await db()`delete from scotty_sessions where token_hash=${h}`}
  return json({ok:true,authenticated:false},200,{"set-cookie":"scotty_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"});
 }

 if(req.method==="POST"&&u.pathname==="/api/auth/change-password"){
  if(!(await validSession(req)))return json({ok:false,error:"Authentication required"},401);
  let body:any;try{body=await req.json()}catch{return json({ok:false,error:"Invalid JSON"},400)}
  const current=String(body?.currentPassword||""),next=String(body?.newPassword||"");
  if(next.length<8)return json({ok:false,error:"New password must be at least 8 characters"},400);
  const o=await owner();
  if(!o||!(await Bun.password.verify(current,o.passwordHash)))return json({ok:false,error:"Current password is incorrect"},401);
  await writeOwner(next,"native");
  await db()`delete from scotty_sessions`;
  const cookie=await createSession(req);
  return json({ok:true,authenticated:true,passwordChanged:true},200,{"set-cookie":cookie});
 }

 return json({ok:false,error:"Authentication route not found"},404);
}
