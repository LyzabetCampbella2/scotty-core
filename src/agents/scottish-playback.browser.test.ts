import {test,expect,beforeAll,afterAll} from 'bun:test';
import {chromium,webkit} from 'playwright';
import {readFile} from 'node:fs/promises';
let browser:any;
beforeAll(async()=>{browser=await(process.env.SCOTTY_UI_BROWSER==='webkit'?webkit:chromium).launch({headless:true});},60000);
afterAll(async()=>{await browser?.close();});
function wav(){const b=Buffer.alloc(44+1600);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(1600,40);return b;}
async function fixture(fallback=false){
 const page=await browser.newPage({viewport:{width:1024,height:1366},isMobile:true,hasTouch:true}),errors:string[]=[],requests:string[]=[];
 page.on('pageerror',(e:any)=>errors.push(e.message));
 await page.route('https://scotty.test/**',async(route:any)=>{const u=new URL(route.request().url());requests.push(u.pathname);
  if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<main class="main"></main><header></header><button id="mic">Microphone</button><span id="vs"></span><span id="cs"></span><section id="voiceSettings" hidden><p id="voiceMsg"></p></section><script>window.speaking=false;window.voiceArmed=true;window.command=async()=>{};window.clearVoiceBuffers=()=>{};window.SCOTTYConversation={preferences:{speed:1},pronounce:t=>t};window.unlockAudio=async()=>{if(!window.audioCtx)window.audioCtx=new(window.AudioContext||window.webkitAudioContext)();await window.audioCtx.resume();};</script>'});
  if(u.pathname.endsWith('/speak'))return route.fulfill({json:{job_id:'synthetic'}});
  if(u.pathname.endsWith('/audio'))return route.fulfill({contentType:'audio/wav',body:wav()});
  return route.fulfill({json:{state:'complete'}});
 });
 await page.goto('https://scotty.test/');
 if(fallback)await page.evaluate(()=>{window.unlockAudio=()=>{};HTMLMediaElement.prototype.play=function(){return this.muted?Promise.resolve():Promise.reject(new DOMException('Tap needed','NotAllowedError'));};});
 await page.addScriptTag({content:await readFile('public/render-hotfix.js','utf8')});
 return {page,errors,requests};
}
test('tablet gesture permits real WAV decoding and delayed Scottish playback',async()=>{const {page,errors,requests}=await fixture();try{await page.click('#mic');await page.evaluate(async()=>{await speak('Synthetic voice transport test');});expect(await page.evaluate(()=>window.SCOTTYVoiceTransport.state)).toBe('LISTENING');expect(await page.evaluate(()=>window.audioCtx.state)).toBe('running');expect(await page.evaluate(()=>window.speaking)).toBe(false);expect(requests).toContain('/api/voice/scottish/jobs/synthetic/audio');expect(errors).toEqual([]);}finally{await page.close();}},30000);
test('tablet autoplay denial provides a visible HUD recovery control outside hidden settings',async()=>{const {page,errors}=await fixture(true);try{await page.evaluate(()=>{window.pendingSpeech=speak('Synthetic reply');});await page.waitForFunction(()=>window.SCOTTYVoiceTransport.state==='READY TO PLAY');expect(await page.locator('#voiceSettings').isVisible()).toBe(false);expect(await page.locator('#scottySpeechRecovery').isVisible()).toBe(true);expect(await page.locator('#scottyPlayReadyAudio').isVisible()).toBe(true);await page.evaluate(async()=>{window.SCOTTYVoiceTransport.stop();await window.pendingSpeech;});expect(await page.evaluate(()=>window.speaking)).toBe(false);expect(errors).toEqual([]);}finally{await page.close();}},30000);
