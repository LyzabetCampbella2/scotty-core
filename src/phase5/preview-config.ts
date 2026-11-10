/** Configuration guard; does not independently prove database isolation. */
import {Denied} from './lifecycle.ts';
const dbKey=(raw:string):string=>{
 try{const u=new URL(raw);if(!['postgresql:','postgres:'].includes(u.protocol)||!u.hostname||!u.username||!u.pathname||u.pathname==='/')throw Error('bad');return u.hostname.toLowerCase()+':'+(u.port||'5432')+'/'+decodeURIComponent(u.pathname.slice(1));}
 catch{throw new Denied('invalid_db_url');}
};
export function assertPreviewDbConfig(env:NodeJS.ProcessEnv=process.env):string{
 if(env.SCOTTY_ENV!=='staging'||env.SCOTTY_PHASE5_STAGING_ENABLED!=='true'||env.SCOTTY_PHASE5_READ_ONLY!=='true')throw new Denied('preview_disabled');
 const url=env.SCOTTY_PHASE5_STAGING_DATABASE_URL;
 const expectedHost=env.SCOTTY_PHASE5_STAGING_DB_HOST;
 const expectedName=env.SCOTTY_PHASE5_STAGING_DB_NAME;
 if(!url||!expectedHost||!expectedName||!/^[A-Za-z0-9_-]+$/.test(expectedName))throw new Denied('staging_db_not_reviewed');
 let parsed:URL;try{parsed=new URL(url);}catch{throw new Denied('invalid_db_url');}
 const key=dbKey(url);
 if(parsed.hostname.toLowerCase()!==expectedHost.toLowerCase()||decodeURIComponent(parsed.pathname.slice(1))!==expectedName)throw new Denied('staging_db_mismatch');
 for(const prodUrl of [env.DATABASE_URL,env.SCOTTY_DATABASE_URL,env.SCOTTY_WORKSPACE_DATABASE_URL]){
  if(prodUrl&&key===dbKey(prodUrl))throw new Denied('production_db_overlap');
 }
 return url;
}
