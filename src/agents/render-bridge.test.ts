import {test,expect} from "bun:test";
import {handleRenderAgentBrains} from "./render-bridge.ts";
const url=new URL("https://scotty.example/api/agent-brains/learning/review");
test("Render adapter leaves unrelated HUD routes untouched",async()=>{
 const u=new URL("https://scotty.example/api/hud/agents");
 expect(await handleRenderAgentBrains(new Request(u),u,async()=>true)).toBeNull();
});
test("Agent Brain route defaults to disabled",async()=>{
 const previous=process.env.SCOTTY_AGENT_BRAINS_ENABLED;
 delete process.env.SCOTTY_AGENT_BRAINS_ENABLED;
 try{const r=await handleRenderAgentBrains(new Request(url),url,async()=>true);expect(r?.status).toBe(503)}
 finally{if(previous===undefined)delete process.env.SCOTTY_AGENT_BRAINS_ENABLED;else process.env.SCOTTY_AGENT_BRAINS_ENABLED=previous}
});
test("Render adapter rejects unauthenticated browser requests",async()=>{
 const previous=process.env.SCOTTY_AGENT_BRAINS_ENABLED;
 process.env.SCOTTY_AGENT_BRAINS_ENABLED="true";
 try{const r=await handleRenderAgentBrains(new Request(url),url,async()=>false);expect(r?.status).toBe(401)}
 finally{if(previous===undefined)delete process.env.SCOTTY_AGENT_BRAINS_ENABLED;else process.env.SCOTTY_AGENT_BRAINS_ENABLED=previous}
});
