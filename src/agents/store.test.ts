import {test,expect} from "bun:test";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
const dir=mkdtempSync(join(tmpdir(),"scotty-brains-test-"));
process.env.SCOTTY_BRAIN_DATA_DIR=dir;
const {createBrain,propose,review,listMemories,listProposals}=await import("./store.ts");
test("reviewed learning is persisted and rejected learning is not",async()=>{
 await createBrain({id:"test-writer",name:"Writer",department:"creative",specialty:"editing",instructions:"",knowledgeSources:[]});
 const yes=await propose("test-writer",{text:"Approved knowledge",source:"owner",scope:"private"});
 const no=await propose("test-writer",{text:"Rejected knowledge",source:"unverified",scope:"private"});
 await review(yes.id,"approved","owner");await review(no.id,"rejected","owner");
 const memories=await listMemories({id:"owner",role:"owner"},"test-writer");
 expect(memories.some(x=>x.text==="Approved knowledge")).toBe(true);
 expect(memories.some(x=>x.text==="Rejected knowledge")).toBe(false);
 expect((await listProposals()).find(x=>x.id===no.id)?.status).toBe("rejected");
 expect(review(yes.id,"approved","owner")).rejects.toThrow();
});
test("unauthorized agent cannot read private memory",async()=>{
 const memories=await listMemories({id:"other",role:"agent",department:"engineering",projectIds:[]},"test-writer");
 expect(memories).toHaveLength(0);
});
process.on("exit",()=>{try{rmSync(dir,{recursive:true,force:true});}catch{}});
