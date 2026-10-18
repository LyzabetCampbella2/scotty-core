import {test,expect,beforeAll,afterAll} from 'bun:test';
import {chromium} from 'playwright';
import {renderProjectMissions} from './project-mission-ui.ts';
let browser:any;beforeAll(async()=>{browser=await chromium.launch({headless:true});},60000);afterAll(async()=>{await browser?.close();});
test('tablet owner flow selects scoped evidence, chief dependencies and revision-bound review',async()=>{
 const page=await browser.newPage({viewport:{width:1024,height:1366},isMobile:true,hasTouch:true});const errors:string[]=[];page.on('pageerror',(e:any)=>errors.push(e.message));let spec:any,status='awaiting_approval',mission:any=null;const posts:any[]=[];
 const id='00000000-0000-4000-8000-000000000001';
 await page.route('https://scotty.test/**',async(route:any)=>{
  const request=route.request(),url=new URL(request.url());if(!url.pathname.startsWith('/api/')){const response=renderProjectMissions();return route.fulfill({status:200,headers:Object.fromEntries(response.headers),body:await response.text()});}
  let data:any={ok:true};if(request.method()==='POST'){
   const b=request.postDataJSON();posts.push({body:b,csrf:request.headers()['x-scotty-csrf'],origin:request.headers().origin});
   if(!b.action){spec=b.spec;data={ok:true,id};}
   if(b.action==='approve')status='approved';
   if(b.action==='start-coordination')status='running';
   if(b.action==='tick-coordination'){status='needs_review';mission={results:[{stepId:spec.steps[0].id,agentId:'chief-0',text:'SIMULATION: evidence needs review',status:'draft'}]};}
   if(b.action==='review'){mission.results[0].status='released';status='completed';}
  }else if(url.pathname.endsWith('/recommendations'))data={ok:true,agents:[{id:'chief-0',name:'Chief Alpha',department:'Research',isChief:true},{id:'chief-1',name:'Chief Beta',department:'Operations',isChief:true}],sources:[{id:'memory-a',agentId:'chief-0',text:'Approved synthetic evidence',source:'CI fixture',approvedBy:'owner',recipients:[]}],handoffs:[{id:'handoff-a',title:'Review analysis',sourceAgentId:'chief-0',recipientAgentId:'chief-1'}]};
  else if(url.pathname.endsWith('/'+id))data={ok:true,plan:{plan_id:id,revision:1,status,spec},history:[{revision:1}],mission};else if(url.pathname==='/api/agent-brains/project-missions')data={ok:true,projects:[{id:'synthetic-project',name:'Synthetic project'}]};else data={ok:true,plans:[]};
  return route.fulfill({json:data});
 });
 try{
  await page.goto('https://scotty.test/agents/project-missions');await page.getByLabel('Project',{exact:true}).selectOption('synthetic-project');await page.getByRole('button',{name:'Open project',exact:true}).click();await page.locator('#steps fieldset').waitFor();
  await page.getByLabel('Purpose',{exact:true}).fill('<img src=x onerror=alert(1)> Synthetic draft');
  let first=page.locator('#steps fieldset').nth(0);await first.getByLabel('Assigned project member').selectOption('chief-0');await first.getByLabel('Assignment',{exact:true}).fill('Analyze evidence');await first.getByLabel('Expected deliverable').fill('Analysis draft');await first.getByLabel('Approved evidence available to this agent').selectOption('memory-a');
  await page.getByRole('button',{name:'Add step',exact:true}).click();const second=page.locator('#steps fieldset').nth(1);await second.getByLabel('Assigned project member').selectOption('chief-1');await second.getByLabel('Assignment',{exact:true}).fill('Review the analysis and its gaps');await second.getByLabel('Expected deliverable').fill('Chief review');const dependency=await first.getAttribute('data-id');await second.getByLabel('Prerequisite steps').selectOption(dependency);
  await page.getByLabel('Coordinate through selected chiefs').check();await page.getByLabel('Lead chief reviewer').selectOption('chief-1');await page.getByLabel('Supporting chiefs').selectOption('chief-0');await page.getByLabel('Approved cross-chief handoffs').selectOption('handoff-a');
  await page.getByRole('button',{name:'Save plan for review',exact:true}).click();await page.getByText('Revision 1 · awaiting_approval',{exact:true}).waitFor();expect(spec.steps[0].sourceIds).toEqual(['memory-a']);expect(spec.steps[1].dependsOn).toEqual([spec.steps[0].id]);expect(spec.coordination.handoffs[0].requestId).toBe('handoff-a');expect(spec.coordination.limits.maxModelCalls).toBe(0);expect(await page.locator('img').count()).toBe(0);
  await page.getByRole('button',{name:'Approve this revision',exact:true}).click();await page.getByText('Revision 1 · approved',{exact:true}).waitFor();await page.getByRole('button',{name:'Start or resume coordinated simulation',exact:true}).click();await page.getByText('Revision 1 · running',{exact:true}).waitFor();await page.getByRole('button',{name:'Run next ready simulated step',exact:true}).click();await page.getByText('Revision 1 · needs_review',{exact:true}).waitFor();await page.getByLabel('Review note',{exact:true}).fill('Synthetic owner review');await page.getByRole('button',{name:'Release draft',exact:true}).click();await page.getByText('Revision 1 · completed',{exact:true}).waitFor();
  expect(posts.every(p=>p.csrf==='1'&&p.origin==='https://scotty.test')).toBe(true);expect(posts.filter(p=>p.body.action).every(p=>p.body.revision===1)).toBe(true);expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{await page.close();}
},30000);
