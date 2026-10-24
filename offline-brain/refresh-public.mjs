/**
 * Offline-first PUBLIC feed discovery worker. No SCOTTY Core integration.
 * Fetch happens ONLY when explicitly invoked with a public-network flag.
 * Remote data is treated as untrusted, never as instructions or verified truth.
 */
import {createHash} from "node:crypto";
import {PUBLIC_FEEDS} from "./update-sources.mjs";
import {buildSyntheticRoster,DEPARTMENTS} from "./catalog.mjs";

const MAX_XML_BYTES=800_000, MAX_ITEMS_PER_FEED=25;
const trust="pending-review";
const head=(x,max=220)=>String(x??"").replace(/<[^>]*>/g," ").replace(/[\u0000-\u001f\u007f]+/g," ").replace(/\s+/g," ").trim().slice(0,max);
const decode=s=>String(s??"").replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,(all,code)=>{
 if(code[0]==="#"){const c=code[1]?.toLowerCase()==="x"?parseInt(code.slice(2),16):parseInt(code.slice(1),10);return Number.isInteger(c)&&c>=32&&c<=0x10ffff?String.fromCodePoint(c):" ";}
 return ({amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" "})[code.toLowerCase()]||all;
});
const tag=(xml,name)=>{const match=xml.match(new RegExp("<(?:[A-Za-z0-9_-]+:)?" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_-]+:)?" + name + "\\s*>","i"));return match?decode(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1")):"";};
const hostnameOK=(host,suffix)=>host===suffix||host.endsWith("."+suffix);
function safeArticleUrl(candidate,publisherDomain){
 try{
  const u=new URL(String(candidate||""));if(u.protocol!=="https:"||u.username||u.password||u.port||!hostnameOK(u.hostname.toLowerCase(),publisherDomain))return null;
  u.hash="";return u.href;
 }catch{return null;}
}
function validatePublisher(feed){
 if(!feed||typeof feed!=="object"||!Array.isArray(feed.departments)||!feed.departments.length||!Number.isInteger(feed.maxItems)||feed.maxItems>MAX_ITEMS_PER_FEED)throw Error("Invalid publisher entry");
 const u=new URL(feed.url);
 const domains=new Set(["nist.gov","arxiv.org","nasa.gov","sec.gov"]);
 if(u.protocol!=="https:"||u.username||u.password||u.port||!domains.has(feed.publisherDomain)||!hostnameOK(u.hostname,feed.publisherDomain))throw Error("Publisher URL failed allowlist");
 if(feed.departments.some(d=>!DEPARTMENTS.some(v=>v.name===d)))throw Error("Unknown department");
}
export function parsePublicFeed(xml,feed,{now=new Date()}={}){
 validatePublisher(feed);
 if(typeof xml!=="string"||xml.length>MAX_XML_BYTES)throw Error("Feed too large");
 // This is bounded extraction, NOT an XML evaluator; no DTDs/entities or scripts executed.
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error("External XML entities or DTD are not permitted");
 const blocks=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item\s*>|<entry(?:\s[^>]*)?>[\s\S]*?<\/entry\s*>/gi)||[];
 if(!blocks.length)throw Error("No recognizable RSS/Atom articles");
 const seen=new Set(),out=[];
 for(const item of blocks.slice(0,MAX_ITEMS_PER_FEED*3)){
  const title=head(tag(item,"title"),180);
  let link=tag(item,"link").trim();
  if(!link){
    const l=item.match(/<link\b([^>]*?)\/?\s*>/i);
    const attr=l?.[1]?.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    link=decode(attr?.[2]||"");
  }
  const url=safeArticleUrl(link,feed.publisherDomain);
  if(!title||!url||seen.has(url))continue;
  // Published can be missing; never invent a publication timestamp.
  const rawDate=tag(item,"pubDate")||tag(item,"published")||tag(item,"updated")||tag(item,"date");
  const date=rawDate&&Number.isFinite(Date.parse(rawDate))?new Date(rawDate).toISOString():null;
  const future=date&&new Date(date).getTime()>now.getTime()+86400_000;
  const id=createHash("sha256").update(feed.id+"\n"+url).digest("hex").slice(0,24);
  seen.add(url);
  out.push(Object.freeze({id,sourceId:feed.id,publisher:feed.publisher,title,url,publishedAt:future?null:date,departments:[...feed.departments],status:trust,verifiedFact:false,modelTrainingUsed:false}));
  if(out.length>=feed.maxItems)break;
 }
 if(!out.length)throw Error("No valid HTTPS articles from approved publisher");
 return out;
}
async function safelyDownload(feed,fetcher,{timeoutMs=12000}={}){
 validatePublisher(feed);
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const res=await fetcher(feed.url,{method:"GET",redirect:"manual",headers:{accept:"application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9", "user-agent":"Scotty-Public-News-Indexer/0.1 (noncommercial, no article mirror)"},signal:controller.signal});
  // Explicitly fail closed on redirects to avoid SSRF and altered publishers.
  if(!res||res.status!==200)throw Error("Source unavailable or redirect detected (status "+(res?.status??"unknown")+")");
  const type=(res.headers?.get?.("content-type")||"").toLowerCase();
  if(type&&!/xml|rss|atom|text\/plain/.test(type))throw Error("Non-feed response type");
  const buf=await res.arrayBuffer();
  if(buf.byteLength>MAX_XML_BYTES)throw Error("Feed response exceeds maximum size");
  return new TextDecoder("utf-8",{fatal:false}).decode(buf);
 }finally{clearTimeout(timer);}
}
function shortFailure(e){
 const msg=String(e?.message||"source error");
 return head(msg.replace(/https?:\/\/\S+/g,"[source]"),120);
}
export async function refreshPublicKnowledge({
 feeds=PUBLIC_FEEDS,fetcher=globalThis.fetch,allowPublicNetwork=false,now=new Date(),
 previous=null
}={}){
 if(!allowPublicNetwork)throw Error("PUBLIC_NETWORK_DISABLED: explicit public feed refresh required");
 if(typeof fetcher!=="function"||!Array.isArray(feeds)||feeds.length>25)throw Error("Invalid refresh options");
 const runs=[],records=[];
 for(const feed of feeds){
  try{
   const xml=await safelyDownload(feed,fetcher,{});
   const items=parsePublicFeed(xml,feed,{now});
   runs.push({sourceId:feed.id,publisher:feed.publisher,status:"ok",articleCount:items.length,refreshedAt:now.toISOString()});
   records.push(...items);
  }catch(e){
   runs.push({sourceId:String(feed?.id||"unknown").slice(0,50),publisher:String(feed?.publisher||"").slice(0,50),status:"error",reason:shortFailure(e),articleCount:0,refreshedAt:null});
  }
 }
 const prev=Array.isArray(previous?.records)?previous.records:[];
 // Previous records are never considered verified; preserve only if static source id/url/title & mapped scope pass.
 const ids=new Set(records.map(x=>x.id));
 for(const old of prev.slice(0,500)){
  const origin=PUBLIC_FEEDS.find(f=>f.id===old?.sourceId);
  if(!origin||ids.has(old.id)||!safeArticleUrl(old.url,origin.publisherDomain)||typeof old.title!=="string")continue;
  if(!origin.departments.every(d=>old.departments?.includes(d)))continue;
  records.push({...old,id:String(old.id).slice(0,24),title:head(old.title,180),departments:[...origin.departments],status:trust,verifiedFact:false,modelTrainingUsed:false});
  ids.add(old.id);
 }
 records.sort((a,b)=>String(b.publishedAt||"").localeCompare(String(a.publishedAt||"")));
 const coverage=DEPARTMENTS.map(d=>{
  const deptRuns=runs.filter(r=>PUBLIC_FEEDS.some(f=>f.id===r.sourceId&&f.departments.includes(d.name)));
  return {department:d.name,feedsAttempted:deptRuns.length,feedsSuccessful:deptRuns.filter(r=>r.status==="ok").length,visibleItems:records.filter(item=>item.departments.includes(d.name)).length};
 });
 return Object.freeze({
   schemaVersion:1,kind:"PUBLIC_SOURCE_DISCOVERIES_ONLY",generatedAt:now.toISOString(),providerCalls:0,productionWrites:0,
   connectedToGroq:false,connectedToGrok:false,verifiedFactCount:0,recordCount:records.length,
   runs,coverage,records,warnings:[
    "These are unreviewed titles and references, NOT verified facts, full articles, or retrained model knowledge.",
    "Updates run only when explicitly called; no recurring workflow or production runtime has been enabled.",
    "A successful source fetch does not establish validity, authority of claims, or license to reproduce content.",
    "Record-level statuses remain pending-review even for government or academic publishers."
   ]
 });
}
export function updatesForAgent(snapshot,agentId,{now=new Date(),limit=20}={}){
 const agent=buildSyntheticRoster().find(a=>a.id===agentId);
 if(!agent)throw Error("Unknown synthetic agent");
 if(!snapshot||snapshot.kind!=="PUBLIC_SOURCE_DISCOVERIES_ONLY"||!Array.isArray(snapshot.records))throw Error("Invalid public snapshot");
 const out=snapshot.records.filter(r=>
   r.status===trust&&r.verifiedFact===false&&r.departments?.includes(agent.department)&&
   PUBLIC_FEEDS.some(f=>f.id===r.sourceId&&f.departments.includes(agent.department)&&safeArticleUrl(r.url,f.publisherDomain))
 ).slice(0,Math.min(30,Math.max(1,Math.trunc(limit)||20))).map(r=>{
  const age=r.publishedAt?now.getTime()-Date.parse(r.publishedAt):null;
  return {id:r.id,title:head(r.title,180),publisher:r.publisher,url:r.url,
   publishedAt:r.publishedAt||null,stale:age===null||!Number.isFinite(age)||age>90*86400_000,
   status:"unreviewed-source-reference",allowedDepartment:agent.department,verifiedFact:false};
 });
 return {agentId,department:agent.department,sourceReferences:out,sourceCount:out.length,
   note:"References only; no article body, private data or factual assertion. Verify source before citing a claim."};
}
