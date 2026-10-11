import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
function harness(){
 const elements=new Map(),calls=[];
 const $=id=>{if(!elements.has(id))elements.set(id,{clientWidth:800,clientHeight:600,width:0,height:0,textContent:'',style:{},classList:{toggle(){},remove(){}},getContext:()=>new Proxy({},{get:()=>()=>{}})});return elements.get(id)};
 const nodes=[{id:'alpha',x:200,y:200},{id:'beta',x:600,y:200}];
 const grabs=new Map();let view={zoom:1,orbit:0,panX:0,panY:0};
 const canvas={handGrab(i,x,y){const n=nodes.find(n=>Math.hypot(n.x-x,n.y-y)<70);if(!n||[...grabs.values()].includes(n))return null;grabs.set(i,n);calls.push(['select',n.id]);return n.id},handMove(i,x,y){const n=grabs.get(i);if(n){n.x=x;n.y=y;calls.push(['move',n.id])}},handRelease(i){grabs.delete(i)},handView(){return {...view}},handTransform(v,r,a,x,y){view={zoom:v.zoom*r,orbit:v.orbit+a,panX:v.panX+x,panY:v.panY+y}},handEndView(){calls.push(['saveView'])}};
 const ctx=vm.createContext({$,window:{SCOTTYSpatial:canvas},ginfo:p=>({pinchRatio:p.ratio,open:p.open}),cursorFromHand:p=>({x:p[8].x*800,y:p[8].y*600}),eyesHidePointer(){},eyesCursorDiagnostic(){},angleDelta:(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),Math,Number});
 vm.runInContext(html.slice(html.indexOf('/* SCOTTY_EYES_CANVAS_V3'),html.indexOf('function drawHands(r)')),ctx);
 return{frame(ps){ctx.ps=ps;vm.runInContext('eyesV2Hands({multiHandLandmarks:ps})',ctx)},reset(){vm.runInContext('eyesV2Reset()',ctx)},nodes,grabs,calls,get view(){return view}};
}
function hand(x,y,ratio=.1,open=false){const p=Array.from({length:21},()=>({x:x/800,y:y/600}));p.ratio=ratio;p.open=open;return p}
test('either hand selects and moves a visible node then releases',()=>{
 for(const x of [200,600]){const h=harness();h.frame([hand(x,200,1)]);h.frame([hand(x,200)]);h.frame([hand(x,200)]);assert.equal(h.grabs.size,1);assert.equal(h.calls.filter(c=>c[0]==='select').length,1);h.frame([hand(x+50,240)]);assert.equal(h.nodes.find(n=>n.x===x+50)?.y,240);h.frame([hand(x+50,240,1)]);assert.equal(h.grabs.size,0)}
});
test('two pinches zoom and rotate together, then zoom out',()=>{
 const h=harness();h.frame([hand(200,300),hand(600,300)]);const start=h.view;h.frame([hand(120,220),hand(680,380)]);assert(h.view.zoom>start.zoom);assert(Math.abs(h.view.orbit-start.orbit)>.2);const bigger=h.view.zoom;h.frame([hand(300,260),hand(500,340)]);assert(h.view.zoom<bigger);assert.equal(h.grabs.size,0);
});
test('navigation ends without grabbing from a still-held pinch',()=>{
 const h=harness();h.frame([hand(200,200),hand(600,200)]);h.frame([hand(200,200)]);h.frame([hand(200,200)]);assert.equal(h.grabs.size,0);h.frame([hand(200,200,1)]);h.frame([hand(200,200)]);h.frame([hand(200,200)]);assert.equal(h.grabs.size,1);
});
test('one open palm pans; relaxed hand does not select',()=>{
 const h=harness();h.frame([hand(200,200,1,true)]);h.frame([hand(260,230,1,true)]);assert.equal(h.view.panX,60);assert(Math.abs(h.view.panY-30)<1e-8);assert.equal(h.grabs.size,0);h.frame([hand(200,200,.8)]);h.frame([hand(200,200,.8)]);assert.equal(h.grabs.size,0);
});
test('lost tracking and stop clear grabs, allowing a fresh pinch',()=>{
 const h=harness();h.frame([hand(200,200)]);h.frame([hand(200,200)]);h.frame([]);assert.equal(h.grabs.size,0);h.frame([hand(200,200)]);h.frame([hand(200,200)]);assert.equal(h.grabs.size,1);h.reset();assert.equal(h.grabs.size,0);
});
test('detection order swapping preserves the held hand',()=>{
 const h=harness();h.frame([hand(200,200),hand(600,200,1)]);h.frame([hand(200,200),hand(600,200,1)]);assert.equal(h.grabs.size,1);h.frame([hand(600,200,1),hand(240,220)]);assert(h.nodes.some(n=>Math.abs(n.x-240)<1e-8&&Math.abs(n.y-220)<1e-8));
});
test('inline scripts parse and spatial bridge exposes required controls',()=>{
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!/\bsrc=/.test(m[1]))new vm.Script(m[2]);
 assert.match(html,/SCOTTYSpatial=\{handGrab,handMove,handRelease,handView,handTransform,handEndView/);
});
