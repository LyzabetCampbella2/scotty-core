import {test,expect} from "bun:test";
import {handleAgents} from "./api.ts";
test("agent API disabled when no admin token is configured",async()=>{const old=process.env.SCOTTY_BRAIN_ADMIN_TOKEN;delete process.env.SCOTTY_BRAIN_ADMIN_TOKEN;try{const url=new URL("http://localhost/api/agents");const res=await handleAgents(new Request(url),url);expect(res.status).toBe(503);}finally{if(old!==undefined)process.env.SCOTTY_BRAIN_ADMIN_TOKEN=old;}});
test("rejects unauthorized requests",async()=>{const old=process.env.SCOTTY_BRAIN_ADMIN_TOKEN;process.env.SCOTTY_BRAIN_ADMIN_TOKEN="test-secret";try{const url=new URL("http://localhost/api/agents");const res=await handleAgents(new Request(url),url);expect(res.status).toBe(401);}finally{if(old===undefined)delete process.env.SCOTTY_BRAIN_ADMIN_TOKEN;else process.env.SCOTTY_BRAIN_ADMIN_TOKEN=old;}});

test("owner cookie requires same-origin and CSRF header for writes",async()=>{
 const old=process.env.SCOTTY_BRAIN_ADMIN_TOKEN,prior=process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;
 process.env.SCOTTY_BRAIN_ADMIN_TOKEN="test-secret";process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN="session-test";
 try{
 const url=new URL("http://localhost/api/agents");
 const payload=JSON.stringify({id:"writer",name:"Writer",department:"creative",specialty:"editing",instructions:"",knowledgeSources:[]});
 const make=(origin:string,csrf?:string)=>handleAgents(new Request(url,{method:"POST",headers:{"Cookie":"scotty_owner_session=session-test","Content-Type":"application/json","Origin":origin,...(csrf?{"X-Scotty-CSRF":csrf}:{})},body:payload}),url);
 expect((await make("https://evil.example","1")).status).toBe(403);
 expect((await make("http://localhost")).status).toBe(403);
 }finally{
 if(old===undefined)delete process.env.SCOTTY_BRAIN_ADMIN_TOKEN;else process.env.SCOTTY_BRAIN_ADMIN_TOKEN=old;
 if(prior===undefined)delete process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN;else process.env.SCOTTY_BRAIN_OWNER_SESSION_TOKEN=prior;
 }
});
