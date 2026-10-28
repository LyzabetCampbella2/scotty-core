/** Additive roster synchronization. Existing identity and operational fields are never updated. */
export function planBrainRoster(existing,catalog){
 if(!Array.isArray(catalog)||catalog.length!==185||new Set(catalog.map(a=>a.id)).size!==185)throw Error('INVALID_BRAIN_CATALOG');
 if(catalog.filter(a=>a.isChief===true).length!==25||catalog.filter(a=>a.isChief===false).length!==160)throw Error('INVALID_BRAIN_COUNTS');
 const byId=new Map(catalog.map(a=>[a.id,a]));
 for(const a of catalog){
  if(!/^[a-z0-9-]{1,90}$/.test(a.id)||typeof a.name!=='string'||!a.name||typeof a.department!=='string'||!a.department||!a.brain||a.brain.agentId!==a.id)throw Error('INVALID_BRAIN_IDENTITY');
  if(!a.isChief&&!byId.get(a.chiefId)?.isChief)throw Error('INVALID_CHIEF_LINK');
 }
 if(!Array.isArray(existing)||existing.length<128)throw Error('ORIGINAL_ROSTER_NOT_READY');
 for(const original of existing){
  const a=byId.get(original.id);
  if(!a||['name','department','chiefId','isChief'].some(k=>(a[k]??null)!==(original[k]??null)))throw Error('ORIGINAL_ROSTER_MISMATCH');
 }
 const ids=new Set(existing.map(a=>a.id));
 return catalog.filter(a=>!ids.has(a.id));
}
export async function syncBrainRoster(sql,catalog){
 return sql.begin(async tx=>{
  await tx`lock table scotty_agents in share row exclusive mode`;
  const existing=await tx`select id,name,department,is_chief as "isChief",chief_id as "chiefId" from scotty_agents`;
  const additions=planBrainRoster(existing,catalog);
  for(const a of additions){
   await tx`insert into scotty_agents(id,name,department,rank,is_chief,chief_id,model,sort_order,raw)
    values(${a.id},${a.name},${a.department},${a.isChief?'Chief':'Agent'},${a.isChief},${a.chiefId||null},'cloudflare-team',${catalog.indexOf(a)},${tx.json({specialty:a.specialty,brain:a.brain,brainProvider:'cloudflare-team'})})`;
  }
  return {added:additions.length,total:existing.length+additions.length,chiefs:25,specialists:160,existingRecordsUpdated:false};
 });
}
export async function fetchBrainCatalog(env,fetcher=fetch){
 if(env.SCOTTY_INDEPENDENT_BRAIN_ENABLED!=='true'||!env.SCOTTY_INDEPENDENT_BRAIN_TOKEN)throw Error('BRAIN_BRIDGE_NOT_READY');
 const url='https://scotty-independent-ipad-brain-lab.lizzybee246.workers.dev';
 if(env.SCOTTY_INDEPENDENT_BRAIN_URL!==url)throw Error('UNEXPECTED_BRAIN_URL');
 const r=await fetcher(url+'/api/catalog',{headers:{authorization:'Bearer '+env.SCOTTY_INDEPENDENT_BRAIN_TOKEN},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('BRAIN_CATALOG_UNAVAILABLE');
 const d=await r.json();return d.agents;
}
