import {test,expect,beforeAll,afterAll} from 'bun:test';
import {chromium,webkit} from 'playwright';
import {readFile} from 'node:fs/promises';
let browser:any;
beforeAll(async()=>{browser=await (process.env.SCOTTY_UI_BROWSER==='webkit'?webkit:chromium).launch({headless:true});},60000);
afterAll(async()=>{await browser?.close();});
test('existing HUD voice entry performs explicit plan and document consent without form input or model calls',async()=>{
 const page=await browser.newPage({viewport:{width:1024,height:1366},isMobile:true,hasTouch:true}),posts:any[]=[],errors:string[]=[];
 page.on('pageerror',(e:any)=>errors.push(e.message));
 const members=[{id:'chief',name:'Chief Alpha',isChief:true,eligible:true,reason:'Permitted chief',assignments:[]},{id:'writer',name:'Writer Beta',isChief:false,eligible:true,reason:'Writing expertise',assignments:[]}];
 await page.route('https://scotty.test/**',async(route:any)=>{
  const r=route.request(),u=new URL(r.url());
  if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<aside class="left"><p class="privacy"></p></aside><main class="main"><canvas id="original"></canvas><div class="toolbar"></div></main><aside class="right"></aside><input id="ci"><p id="cs"></p><script>window.replies=[];window.previous=[];window.SCOTTYConversation={db:{state:{active:"thread"}},getRun:()=>17,legacyResponse:async(text)=>window.replies.push(text)};async function command(t){window.previous.push(t)}</script>'});
  let d:any={ok:true};const kind=u.pathname.split('/').at(-1),b=r.method()==='POST'?r.postDataJSON():null;
  if(b)posts.push({path:u.pathname,body:b,csrf:r.headers()['x-scotty-csrf']});
  if(u.pathname==='/api/agent-brains/project-operations')d={ok:true,projects:[{id:'writing',name:'Writing project'}],realDraftsEnabled:false};
  else if(kind==='team')d={ok:true,candidates:members,recommended:['chief','writer'],note:'Owner editable recommendation'};
  else if(kind==='team-status')d={ok:true,members,decisions:[],pendingHandoffs:0,blocked:[]};
  else if(kind==='documents'&&b.action==='list')d={ok:true,items:[{id:'sample_document',title:'Story notes'}]};
  else if(kind==='documents'&&b.action==='preview')d={ok:true,previewToken:'preview-token',title:'Story notes',body:'Synthetic permitted snapshot',reference:'Google Docs',note:'Read-only snapshot'};
  return route.fulfill({json:d});
 });
 const say=async(text:string)=>{const n=await page.evaluate(()=>window.replies.length);await page.evaluate(t=>command(t),text);await page.waitForFunction(n=>window.replies.length>n,n);return page.evaluate(()=>window.replies.at(-1));};
 const phrase=(s:string)=>s.match(/Say (confirm project \w+ \d+) to confirm/)![1];
 try{
  await page.goto('https://scotty.test/');
  await page.addScriptTag({content:await readFile('public/hud/sidebar-voice-live.js','utf8')});
  await page.addScriptTag({content:await readFile('public/hud/project-operations.js','utf8')});
  await say('Use my writing project');await say('Recommend agents for review my outline');await say('Use agents one and two');await say('Lead chief one');
  const request=await say('Save project plan');expect(posts.filter(x=>x.path.endsWith('/plan'))).toHaveLength(0);expect(await say('yes')).toContain('general yes cannot');await say(phrase(request));
  const plan=posts.find(x=>x.path.endsWith('/plan'));expect(plan.body.agentIds).toEqual(['chief','writer']);expect(plan.body.realDrafts).toBe(false);
  await say('List my Google Docs');await say('Preview document one');await say('Share with agents two');const sharing=await say('Attach document');expect(posts.filter(x=>x.body.action==='attach')).toHaveLength(0);await say(phrase(sharing));expect(posts.find(x=>x.body.action==='attach').body.agentIds).toEqual(['writer']);
  expect(posts.every(x=>x.csrf==='1')).toBe(true);expect(posts.some(x=>x.body.action==='run-draft')).toBe(false);
  expect(await page.locator('#original').count()).toBe(1);expect(await page.locator('#ci').inputValue()).toBe('');expect(errors).toEqual([]);
 }finally{await page.close();}
},30000);
