import { mkdir, writeFile, rename, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { recordAudit } from './audit';
// Local single-host snapshot store. For multi-instance production use durable object storage/database.
export class SnapshotStore<T> {
 constructor(private path:string,private validate:(value:unknown)=>value is T){}
 async save(value:T) {
  if(!this.validate(value))throw new Error('Invalid snapshot');
  await mkdir(dirname(this.path),{recursive:true});
  const temp=this.path+'.'+crypto.randomUUID()+'.tmp';
  await writeFile(temp,JSON.stringify({version:1,createdAt:new Date().toISOString(),data:value}),{mode:0o600});
  await rename(temp,this.path);
  await recordAudit({type:'snapshot',outcome:'saved'});
 }
 async restore():Promise<T|null>{
  try{
   const value=JSON.parse(await readFile(this.path,'utf8'));
   if(value.version!==1||!this.validate(value.data))throw new Error('Snapshot validation failed');
   await recordAudit({type:'snapshot',outcome:'restored'});
   return value.data;
  }catch(e:any){if(e?.code==='ENOENT')return null;throw e;}
 }
}
