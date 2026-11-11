import { describe, expect, test } from "bun:test";
import { canInteractWithObject, previewExternalAction, validateRoster, type WorldObject } from "./contracts";

const book: WorldObject = {
 objectId:"book-1", roomId:"geordi-room",class:"universal",
 allowedActions:["inspect","pickup","carry","drop","throw","gift","store"],
 portable:true,physicsEnabled:true,currentHolderId:null,position:{x:1,y:0,z:2},version:1
};
const tool: WorldObject = {
 ...book, objectId:"scanner-1",class:"professional",professionalField:"engineering",
 allowedActions:["inspect","operate"],portable:false
};
const guest={id:"guest",role:"guest" as const,professionalFields:[]};
const engineer={id:"geordi",role:"agent" as const,canonicalAgentId:"canonical-geordi-test-only",professionalFields:["engineering"]};
const unrelated={id:"worf",role:"agent" as const,canonicalAgentId:"canonical-worf-test-only",professionalFields:["security"]};

describe("Living Interface V4 staging policy",()=>{
 test("universal objects may be carried by visitors",()=>expect(canInteractWithObject(guest,book,"carry").allowed).toBe(true));
 test("unrelated agents cannot operate professional tools",()=>expect(canInteractWithObject(unrelated,tool,"operate").reason).toBe("PROFESSIONAL_FIELD_RESTRICTED"));
 test("only matching field agents can operate professional tools",()=>expect(canInteractWithObject(engineer,tool,"operate").allowed).toBe(true));
 test("visitors cannot operate professional tools",()=>expect(canInteractWithObject(guest,tool,"operate").allowed).toBe(false));
 test("cannot throw a nonportable professional tool",()=>expect(canInteractWithObject(engineer,tool,"throw").allowed).toBe(false));
 test("all external calls fail closed in simulation",()=>expect(previewExternalAction({requestId:"1",origin:"hud",mode:"simulation",principal:engineer,target:{type:"home-device",id:"lamp"},operation:"turn_on"}).allowed).toBe(false));
 test("fabricated approval cannot enable home action",()=>expect(previewExternalAction({requestId:"2",origin:"agent",mode:"live-approved",principal:engineer,target:{type:"home-device",id:"lamp"},operation:"turn_on",ownerApprovalId:"fake"}).allowed).toBe(false));
 test("no synthetic roster is claimed canonical",()=>expect(validateRoster([]).ok).toBe(false));
});
