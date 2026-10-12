import {test,expect} from 'bun:test';
import {EncryptedSnapshotStore} from './persistence';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('encrypted snapshot round trip and incorrect key rejection',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'scotty-encrypted-'));
 try{
  const key=await EncryptedSnapshotStore.importKey(Buffer.alloc(32,1).toString('base64'));
  const other=await EncryptedSnapshotStore.importKey(Buffer.alloc(32,2).toString('base64'));
  const valid=(v:unknown):v is {count:number}=>typeof v==='object'&&v!==null&&typeof (v as any).count==='number';
  const file=join(dir,'snapshot.enc');
  const store=new EncryptedSnapshotStore(file,key,valid);
  await store.save({count:7});
  expect(await store.restore()).toEqual({count:7});
  await expect(new EncryptedSnapshotStore(file,other,valid).restore()).rejects.toThrow();
 }finally{await rm(dir,{recursive:true,force:true})}
});
