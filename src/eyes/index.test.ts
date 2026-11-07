import { test, expect } from "bun:test";
import { handleEyesOn } from "./index.ts";

test("camera analysis fails closed without reading a frame or calling a provider",async()=>{
 const url=new URL("http://localhost/api/eyes/analyze");
 const request=new Request(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageDataUrl:"data:image/jpeg;base64,FAKE_PRIVATE_IMAGE"})});
 const response=await handleEyesOn(request,url);
 expect(response.status).toBe(503);
 const data=await response.json();
 expect(data.ok).toBe(false);
 expect(data.error).toContain("disabled");
});
test("camera status does not falsely advertise analysis readiness",async()=>{
 const url=new URL("http://localhost/api/eyes/status");
 const response=await handleEyesOn(new Request(url),url);
 const data=await response.json();
 expect(data.visionConfigured).toBe(false);
 expect(data.visionExecutionAuthorized).toBe(false);
});
test("camera preview test page does not trigger server-side image analysis",async()=>{
 const url=new URL("http://localhost/api/eyes/test");
 const response=await handleEyesOn(new Request(url),url);
 expect(response.status).toBe(200);
 expect(response.headers.get("content-type")).toContain("text/html");
});
