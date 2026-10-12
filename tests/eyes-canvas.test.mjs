import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
function harness(){
 const elements=new Map(),calls=[];
 const $=id=>{if(!elements.has(id))elements.set(id,{clientWidth:800,clientHeight:600,width:0,height:0,textContent:'',style:{},classList:{toggle(){},remove(){}},getContext:()=>new Proxy({},{get:()=>()=>{}})});return elements.get(id)};
 const nodes=[{id:'alpha',x:200,y:200},{id:'beta',x:600,y:200}];
 const grabs=new Map();let view={zoom:1,orbit:0,panX:0,panY:0,spread:1};
 const canvas={handGrab(i,x,y){const n=nodes.find(n=>Math.hypot(n.x-x,n.y-y)<70);if(!n||[...grabs.values()].includes(n))return null;grabs.set(i,n);calls.push(['select',n.id]);return n.id},handMove(i,x,y){const n=grabs.get(i);if(n){n.x=x;n.y=y;calls.push(['move',n.id])}},handRelease(i){grabs.delete(i)},handView(){return {...view}},handTransform(v,r,a,x,y){view={...view,zoom:v.zoom*r,orbit:v.orbit+a,panX:v.panX+x,panY:v.panY+y}},handSpread(spread){view={...view,spread}},handEndView(){calls.push(['saveView'])}};
 const ctx=vm.createContext({$,window:{SCOTTYSpatial:canvas},ginfo:p=>({pinchRatio:p.ratio,open:p.open}),cursorFromHand:p=>({x:p[8].x*800,y:p[8].y*600}),eyesHidePointer(){},eyesCursorDiagnostic(){},angleDelta:(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),Math,Number});
 vm.runInContext(html.slice(html.indexOf('/* SCOTTY_EYES_CANVAS_V3'),html.indexOf('function drawHands(r)')),ctx);
 return{calibrating(value){ctx.window.SCOTTYGestureCalibration={isCapturing:()=>value}},frame(ps){ctx.ps=ps;vm.runInContext('eyesV2Hands({multiHandLandmarks:ps})',ctx)},reset(){vm.runInContext('eyesV2Reset()',ctx)},nodes,grabs,calls,get view(){return view}};
}
function hand(x,y,ratio=.1,open=false){const p=Array.from({length:21},()=>({x:x/800,y:y/600}));p.ratio=ratio;p.open=open;return p}
test('either hand selects and moves a visible node then releases',()=>{
 for(const x of [200,600]){const h=harness();h.frame([hand(x,200,1)]);h.frame([hand(x,200)]);h.frame([hand(x,200)]);assert.equal(h.grabs.size,1);assert.equal(h.calls.filter(c=>c[0]==='select').length,1);h.frame([hand(x+50,240)]);assert.equal(h.nodes.find(n=>n.x===x+50)?.y,240);h.frame([hand(x+50,240,1)]);assert.equal(h.grabs.size,0)}
});
function palms(h,a=[200,300],b=[600,300]){for(let i=0;i<3;i++)h.frame([hand(...a,1,true),hand(...b,1,true)])}
test('two open palms zoom and rotate together, then zoom out without a mode switch',()=>{const h=harness();palms(h);const start=h.view;h.frame([hand(120,220,1,true),hand(680,380,1,true)]);assert(h.view.zoom>start.zoom);assert(Math.abs(h.view.orbit-start.orbit)>.2);const bigger=h.view.zoom;h.frame([hand(300,260,1,true),hand(500,340,1,true)]);assert(h.view.zoom<bigger);assert.equal(h.grabs.size,0)});
test('ending palm navigation does not grab from a pinch until it is released',()=>{const h=harness();palms(h,[200,200],[600,200]);h.frame([hand(200,200)]);h.frame([hand(200,200)]);assert.equal(h.grabs.size,0);h.frame([hand(200,200,1)]);h.frame([hand(200,200)]);h.frame([hand(200,200)]);assert.equal(h.grabs.size,1)});
test('one open palm does not move the canvas or select nodes',()=>{const h=harness();h.frame([hand(200,200,1,true)]);h.frame([hand(260,230,1,true)]);assert.equal(h.view.panX,0);assert.equal(h.view.panY,0);assert.equal(h.grabs.size,0)});
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

test('palm zoom retains node spacing and keeps spread/regroup controls independent',()=>{const h=harness();palms(h);h.frame([hand(100,300,1,true),hand(700,300,1,true)]);assert.equal(h.view.spread,1);assert.equal(h.view.zoom,1.5)});
test('returning to open palms starts a new baseline and does not jump',()=>{const h=harness();palms(h);h.frame([hand(100,300,1,true),hand(700,300,1,true)]);const zoom=h.view.zoom;h.frame([hand(200,300,1)]);palms(h,[250,300],[550,300]);assert.equal(h.view.zoom,zoom);h.frame([hand(200,300,1,true),hand(600,300,1,true)]);assert.ok(h.view.zoom>zoom)});
test('calibration collects poses without grabbing or transforming canvas and requires a release afterward',()=>{const h=harness();h.calibrating(true);h.frame([hand(200,200)]);h.frame([hand(200,200)]);assert.equal(h.grabs.size,0);h.frame([hand(100,300),hand(700,300)]);assert.equal(h.view.zoom,1);h.calibrating(false);h.frame([hand(200,200)]);assert.equal(h.grabs.size,0);h.frame([hand(200,200,1)]);h.frame([hand(200,200)]);h.frame([hand(200,200)]);assert.equal(h.grabs.size,1)});

test('selection is the default and two pinches select separate nodes without zooming',()=>{const h=harness();h.frame([hand(200,200),hand(600,200)]);h.frame([hand(200,200),hand(600,200)]);assert.equal(h.grabs.size,2);h.frame([hand(150,200),hand(650,200)]);assert.equal(h.view.zoom,1);assert.equal(h.view.orbit,0);assert.equal(h.nodes[0].x,150);assert.equal(h.nodes[1].x,650)});
test('a second pinching hand does not interrupt an existing selection or start navigation',()=>{const h=harness();h.frame([hand(200,200)]);h.frame([hand(200,200)]);h.frame([hand(240,200),hand(600,200)]);h.frame([hand(260,200),hand(650,200)]);assert.equal(h.view.zoom,1);assert.equal(h.nodes[0].x,260);assert.ok(h.grabs.size>=1)});
test('brief open-palm transitions do not accidentally zoom',()=>{const h=harness();h.frame([hand(200,300,1,true),hand(600,300,1,true)]);h.frame([hand(100,300,1,true),hand(700,300,1,true)]);h.frame([hand(100,300,.8),hand(700,300,.8)]);assert.equal(h.view.zoom,1);assert.equal(h.view.orbit,0)});
test('pinching one hand while the other is open selects without changing the canvas',()=>{const h=harness();h.frame([hand(200,200),hand(600,300,1,true)]);h.frame([hand(200,200),hand(700,300,1,true)]);h.frame([hand(240,220),hand(750,300,1,true)]);assert.equal(h.grabs.size,1);assert.equal(h.nodes[0].x,240);assert.equal(h.view.zoom,1);assert.equal(h.view.orbit,0)});
