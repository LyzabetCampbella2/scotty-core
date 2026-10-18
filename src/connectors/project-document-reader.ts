import {addonConnection} from './store.ts';
import {batch2Token} from './batch2-oauth.ts';
import {providerJSON} from './http.ts';
// Narrow read-only adapter. Listing Google Docs fetches titles/IDs, never document bodies.
export async function projectDocumentRead(provider:string,resource:string,query='',pageId=''){
 if(provider==='notion'&&resource==='pages'){const {addonRead}=await import('./adapters.ts');return addonRead('notion','pages',query,pageId);}
 if(provider!=='googledocs'||resource!=='documents')throw Error('Only read-only Google Docs and Notion pages are supported');
 const row=await addonConnection('googledocs'),ids=row.config.documents;if(!Array.isArray(ids))throw Error('Configure permitted Google document IDs first');
 if(query&&!ids.includes(query))throw Error('Document outside allowed scope');const headers={authorization:'Bearer '+await batch2Token('googledocs',row.revision)};
 if(query)return providerJSON('https://docs.googleapis.com/v1/documents/'+encodeURIComponent(query)+'?includeTabsContent=true',{headers});
 const documents=[];for(const id of ids.slice(0,100))documents.push(await providerJSON('https://docs.googleapis.com/v1/documents/'+encodeURIComponent(id)+'?fields=documentId,title,revisionId',{headers}));return {documents,has_more:ids.length>100};
}
