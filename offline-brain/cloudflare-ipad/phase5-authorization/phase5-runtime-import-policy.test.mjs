/**
 * CI safety check only: detect accidental phase5 synthetic imports from
 * outside the isolated test directory. Not a production security proof.
 * Blocking real route imports prevents these fictional identities and
 * disposable credentials from being mistaken for live authorization.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,relative,extname,join} from 'node:path';

const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const ISOLATED=resolve(ROOT,'offline-brain/cloudflare-ipad/phase5-authorization');
const EXTENSIONS=new Set(['.js','.mjs','.jsx','.ts','.tsx','.cjs','.mts','.cts']);
const SKIP=new Set(['.git','node_modules','.next','dist','build','coverage','.turbo','.vercel','vendor']);
function scan(dir,violations,seen={files:0}) {
 for(const item of readdirSync(dir,{withFileTypes:true})){
  if(item.isDirectory()){
   if(SKIP.has(item.name))continue;
   const path=join(dir,item.name);
   if(path===ISOLATED)continue;
   scan(path,violations,seen);
  }else if(item.isFile()&&EXTENSIONS.has(extname(item.name))){
   const file=join(dir,item.name);
   seen.files++;
   const text=readFileSync(file,'utf8');
   // Only static/dynamic source imports and exports, not docs or text labels.
   const imports=/(?:\bfrom\s*|\bimport\s*\(|\bimport\s*|\bexport\s*\*\s*from\s*)['"]([^'"]+)['"]/g;
   for(const match of text.matchAll(imports)){
    if(match[1].includes('phase5-authorization/'))
     violations.push({file:relative(ROOT,file),module:match[1]});
   }
  }
 }
 return seen;
}
test('no application/runtime source imports disposable Phase 5 authorization internals',()=>{
 const violations=[];
 const seen=scan(ROOT,violations);
 assert.ok(seen.files>0,'Expected repository source files to inspect');
 assert.deepEqual(violations,[],'Synthetic Phase 5 imports must remain isolated to test modules');
});
