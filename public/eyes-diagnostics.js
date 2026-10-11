(function(){
"use strict";
if(window.__SCOTTY_EYES_DIAGNOSTICS_V1__)return;
window.__SCOTTY_EYES_DIAGNOSTICS_V1__=true;
const byId=id=>document.getElementById(id);
const eye=byId("eyes"),vision=byId("vision"),video=byId("video");
if(!eye||!vision||!video)return;
const dock=document.createElement("section");
dock.id="scottyEyesDiagnostics";
dock.setAttribute("aria-label","Eyes On diagnostics");
dock.style.cssText="position:fixed;right:12px;bottom:92px;z-index:35;width:min(275px,calc(100vw - 24px));background:rgba(3,17,31,.94);border:1px solid rgba(94,234,255,.35);border-radius:12px;padding:10px;color:#ddf8ff;box-shadow:0 6px 30px #0008;font:11px system-ui;display:none";
dock.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><strong style="letter-spacing:.12em;color:#5eeaff">EYES ON • DIAGNOSTICS</strong><button id="scottyEyesClose" aria-label="Close diagnostics" style="background:none;border:0;color:#ddf8ff;font-size:19px">×</button></div><div id="scottyEyesHealth" role="status" aria-live="polite" style="margin:10px 0;line-height:1.6"></div><div style="display:flex;gap:6px"><button id="scottyEyesRetry" style="flex:1;padding:8px;background:#0c3542;border:1px solid #5eeaff;border-radius:7px;color:#ddf8ff">RETRY CAMERA</button><button id="scottyEyesHideCam" style="flex:1;padding:8px;background:#0c3542;border:1px solid #5eeaff;border-radius:7px;color:#ddf8ff">MINIMIZE</button></div><div style="margin-top:8px;color:#8da8ba;font-size:10px">Camera activates only with your permission. Retry uses the existing Eyes On authorization flow.</div>';
document.body.appendChild(dock);
const toggle=document.createElement("button");
toggle.id="scottyEyesDiagnosticsToggle";toggle.type="button";toggle.textContent="◉ EYES STATUS";
toggle.style.cssText="display:block;margin-top:5px;width:100%;padding:7px;border:1px solid #28616a;border-radius:7px;background:#092231;color:#9ce7e5;font-size:10px";
eye.insertAdjacentElement("afterend",toggle);
toggle.onclick=()=>{dock.style.display=dock.style.display==="none"?"block":"none";update()};
byId("scottyEyesClose").onclick=()=>dock.style.display="none";
byId("scottyEyesRetry").onclick=()=>{dock.style.display="none";if(!vision.classList.contains("on"))eye.click();else update()};
byId("scottyEyesHideCam").onclick=()=>{document.body.classList.toggle("eyes-camera-minimized");byId("scottyEyesHideCam").textContent=document.body.classList.contains("eyes-camera-minimized")?"EXPAND":"MINIMIZE"};
let lastFrame=0,lastTime=Date.now();
function update(){
 const active=vision.classList.contains("on");
 const live=!!(video.srcObject&&video.srcObject.getVideoTracks().some(t=>t.readyState==="live"));
 const ready=video.readyState>=2;
 const now=Date.now(),frames=video.webkitDecodedFrameCount||0;
 if(frames!==lastFrame){lastFrame=frames;lastTime=now}
 const stalled=active&&live&&ready&&frames>0&&now-lastTime>6500;
 const message=!navigator.mediaDevices?.getUserMedia?"Camera unavailable in this browser":!active?"Camera off • privacy protected":!live?"Camera stream interrupted":!ready?"Camera starting":stalled?"Video may be stalled":"Camera streaming";
 const hand=byId("gl")?.textContent||"Not running";
 byId("scottyEyesHealth").textContent=message+" | Hand tracking: "+hand;
 toggle.textContent=active?(stalled||!live?"◉ EYES • CHECK CAMERA":"◉ EYES • ACTIVE"):"◉ EYES • OFF";
 toggle.style.color=active&&live&&!stalled?"#28d7bd":"#9ce7e5";
}
document.addEventListener("visibilitychange",()=>{lastTime=Date.now();update()});
setInterval(update,2000);
update();
})();