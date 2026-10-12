import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
export interface Envelope { version:1; createdAt:string; iv:string; ciphertext:string }
export class EncryptedSnapshotStore<T> {
 constructor(private file:string,private key:CryptoKey,private validate:(v:unknown)=>v is T){}
 static async importKey(base64:string):Promise<CryptoKey>{
  const bytes=Uint8Array.from(Buffer.from(base64,'base64'));
  if(bytes.byteLength!==32)throw new Error('Snapshot key must be 32 bytes');
  return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);
 }
 async save(data:T) {
  if(!this.validate(data))throw new Error('Invalid snapshot data');
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const plaintext=new TextEncoder().encode(JSON.stringify(data));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},this.key,plaintext);
  const envelope:Envelope={version:1,createdAt:new Date().toISOString(),iv:Buffer.from(iv).toString('base64'),ciphertext:Buffer.from(encrypted).toString('base64')};
  await mkdir(dirname(this.file),{recursive:true});
  const temp=this.file+'.'+crypto.randomUUID()+'.tmp';
  await writeFile(temp,JSON.stringify(envelope),{mode:0o600});
  await rename(temp,this.file);
 }
 async restore():Promise<T|null>{
  let envelope:Envelope;
  try{envelope=JSON.parse(await readFile(this.file,'utf8'))}catch(e:any){if(e?.code==='ENOENT')return null;throw e}
  if(envelope.version!==1)throw new Error('Unsupported snapshot version');
  const iv=Buffer.from(envelope.iv,'base64');
  if(iv.length!==12)throw new Error('Invalid IV');
  const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv},this.key,Buffer.from(envelope.ciphertext,'base64'));
  const data:unknown=JSON.parse(new TextDecoder().decode(plaintext));
  if(!this.validate(data))throw new Error('Invalid restored snapshot');
  return data;
 }
}
