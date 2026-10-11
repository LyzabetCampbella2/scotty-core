import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
function setup(){
 const allNodes=[
 {id:'agent:a',type:'agent',name:'ALPHA TWO',detail:'CHIEF • Creative Lab',raw:{isChief:true,department:'Creative Lab'}},
 {id:'agent:b',type:'agent',name:'ALPHA',detail:'Writing specialist',raw:{department:'Editorial'}},
 {id:'project:p',type:'project',name:'Novel',raw:{status:'active'}},
 {id:'file:f',type:'file',name:'Résumé.pdf',raw:{path:'/novel/drafts'}},
 {id:'folder:d',type:'folder',name:'Drafts',raw:{}},
 {id:'task:t',type:'task',name:'Revise Novel',raw:{status:'queued'}},
 ];
 const ctx=vm.createContext({allNodes});
 vm.runInContext(html.slice(html.indexOf(' function searchNodes('),html.indexOf(' async function saveNodeLayout(')),ctx);
 return {ctx,search:(query,type='all')=>Array.from(vm.runInContext(`searchNodes(${JSON.stringify(query)},${JSON.stringify(type)})`,ctx),n=>n.id)};
}
test('exact names outrank partial names, and matching ignores case and accents',()=>{
 const h=setup();assert.deepEqual(h.search('alpha'),['agent:b','agent:a']);assert.deepEqual(h.search('resume'),['file:f']);
});
test('type filters separate chiefs, agents, and resources',()=>{
 const h=setup();assert.deepEqual(h.search('','chief'),['agent:a']);assert.deepEqual(h.search('novel','project'),['project:p']);assert.deepEqual(h.search('novel','task'),['task:t']);assert.deepEqual(h.search('novel','file'),['file:f']);
});
test('multiple keywords search context and include nodes outside visible groups',()=>{
 const h=setup();assert.deepEqual(h.search('creative alpha'),['agent:a']);assert.deepEqual(h.search('drafts resume'),['file:f']);assert.deepEqual(h.search('unknown'),[]);assert.equal(h.search('').length,6);
});
test('result click resolves current node ID, reveals it, and closes search',()=>{
 const elements=new Map(),focused=[];
 const element=()=>({value:'',open:true,textContent:'',children:[],appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},addEventListener(){},querySelector(){return {focus(){}}},querySelectorAll(){return this.children},contains(){return false}});
 for(const id of ['spatialSearch','spatialSearchInput','spatialSearchType','spatialSearchResults','spatialSearchCount'])elements.set('#'+id,element());
 const panel=elements.get('#spatialSearch'),results=elements.get('#spatialSearchResults'),count=elements.get('#spatialSearchCount');
 const node={id:'agent:collapsed',type:'agent',name:'HIDDEN',raw:{department:'Lab'}};
 const ctx=vm.createContext({main:{appendChild(){}},sb:{querySelector:id=>elements.get(id)},document:{querySelector:()=>element(),createElement:element},searchNodes:()=>[node],focusId:id=>{focused.push(id);return node}});
 vm.runInContext(html.slice(html.indexOf(' const searchPanel=sb.querySelector('),html.indexOf(" const tools=document.querySelector('#eyesMultiSelect')",html.indexOf(' const searchPanel=sb.querySelector('))),ctx);
 vm.runInContext('renderSearch()',ctx);assert.equal(count.textContent,'1 matches');assert.equal(results.children[0].textContent,'HIDDEN');results.children[0].onclick();assert.deepEqual(focused,['agent:collapsed']);assert.equal(panel.open,false);
});
