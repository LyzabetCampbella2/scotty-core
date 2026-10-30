import {PUBLIC_FEEDS} from '../update-sources.mjs';
const text=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
export async function discoverFeed(id,fetcher=fetch){
 const feed=PUBLIC_FEEDS.find(f=>f.id===id);if(!feed)throw Error('UNKNOWN_FEED');
 const res=await fetcher(feed.url,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:'application/rss+xml, application/atom+xml, application/xml, text/xml'}});
 if(!res.ok)throw Error('SOURCE_UNAVAILABLE');
 const reader=res.body?.getReader();if(!reader)throw Error('EMPTY_SOURCE');
 let size=0;const chunks=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>150000)throw Error('SOURCE_TOO_LARGE');chunks.push(value);}}finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 const xml=new TextDecoder().decode(bytes);
 if(!/<(?:rss|feed|rdf:RDF)\b/i.test(xml))throw Error('NOT_A_FEED');
 const blocks=xml.match(/<(?:item|entry)\b[^>]*>[\s\S]*?<\/(?:item|entry)>/gi)||[];
 const items=blocks.slice(0,Math.min(feed.maxItems,12)).map(block=>{
  const title=text(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').slice(0,200);
  const raw=block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]||block.match(/<link\b[^>]*href=["']([^"']+)/i)?.[1];
  let url=null;try{const u=new URL(text(raw||''));if(u.protocol==='https:'&&!u.username&&!u.password)url=u.href;}catch{}
  const dateRaw=text(block.match(/<(?:pubDate|published|updated|dc:date)[^>]*>(.*?)<\/(?:pubDate|published|updated|dc:date)>/is)?.[1]||'');
  const d=dateRaw?new Date(dateRaw):null;
  const publishedAt=d&&Number.isFinite(d.getTime())?d.toISOString():null;
  return {title,url,publishedAt,publicationDateAvailable:!!publishedAt,publisher:feed.publisher,sourceFeedId:feed.id,
   discoveredFrom:feed.url,assignedDepartments:feed.departments,verified:false,provenance:'publisher-feed',reviewRequired:true,
   proposedKnowledgeUpdate:{status:'pending-owner-review',title:'Review source: '+title,sourceUrl:url,
    publishedAt,sourcePublisher:feed.publisher,targetDepartments:feed.departments,verifiedClaims:[],
    proposedAction:'Read the original publication, extract verifiable claims and limitations, then request owner approval before adding a note.',
    autoPromote:false}};
 }).filter(i=>i.title&&i.url);
 return {publisher:feed.publisher,feedId:feed.id,sourceUrl:feed.url,fetchedAt:new Date().toISOString(),items,trust:'discovery-only',automaticallySaved:false};
}
