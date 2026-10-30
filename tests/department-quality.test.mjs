import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function harness(){
 const elements=new Map();
 const make=()=>({value:'',checked:false,textContent:'',children:[],append(...xs){this.children.push(...xs);for(const x of xs)if(x.id)elements.set(x.id,x);},replaceChildren(){this.children=[];}});
 const get=id=>{if(!elements.has(id))elements.set(id,make());return elements.get(id)};
 const agents=Array.from({length:25},(_,i)=>[{id:'chief-'+i,name:'Chief '+i,department:'Field '+i,isChief:true},{id:'agent-'+i,name:'Agent '+i,chiefId:'chief-'+i,isChief:false}]).flat();
 const requests=[];
 const html=fs.readFileSync(new URL('../public/brain-lab/index.html',import.meta.url),'utf8');
 const code=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace('status();\n})();',"globalThis.testing={offerQualityReview,getCases:()=>qualityCases};\n})();");
 const ctx=vm.createContext({document:{getElementById:get,createElement:make},Date,Set,Map,crypto:{randomUUID:()=> 'test-mission'},fetch:async(url)=>{requests.push(url);return Response.json({agents})}});
 vm.runInContext(code,ctx);return {get,ctx,requests};
}
test('25 department cases select actual specialists without starting inference',async()=>{
 const h=harness();await h.get('quality').onclick();
 const cases=h.ctx.testing.getCases();assert.equal(cases.length,25);assert.equal(h.requests.length,1);
 for(const c of cases){assert.ok(c.question.length<=500);assert.ok(c.question.startsWith('Use specialist '+c.agentId+':'));}
 h.get('quality-case').value=cases[0].agentId;h.get('approve').checked=true;h.get('load-case').onclick();
 assert.equal(h.get('question').value,cases[0].question);assert.equal(h.get('approve').checked,false);
});
test('incomplete and unreviewed answers cannot pass; uncertain assessments remain needs-work',async()=>{
 const h=harness();await h.get('quality').onclick();const c=h.ctx.testing.getCases()[0];
 h.ctx.testing.offerQualityReview(c.question,{status:'incomplete',answer:'Partial',missionId:'m1'});h.get('record-review').onclick();assert.match(h.get('output').textContent,/Complete a department test/);
 h.ctx.testing.offerQualityReview(c.question,{status:'completed',answer:'Synthetic answer',missionId:'m2'});h.get('record-review').onclick();assert.match(h.get('output').textContent,/Assess every criterion/);
 for(let i=0;i<5;i++)h.get('criterion-'+i).value=i===4?'uncertain':'pass';h.get('record-review').onclick();assert.equal(JSON.parse(h.get('output').textContent).status,'NEEDS_WORK');
 h.get('criterion-4').value='pass';h.get('record-review').onclick();const r=JSON.parse(h.get('output').textContent);assert.equal(r.status,'OWNER_REVIEW_PASSED');assert.equal(r.independentlyVerified,false);
 h.get('quality-results').onclick();assert.equal(JSON.parse(h.get('output').textContent).assessments.length,1);
});
