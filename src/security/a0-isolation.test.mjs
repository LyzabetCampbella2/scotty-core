import test from "node:test";
import assert from "node:assert/strict";
import {isolateA0Database} from "./a0-ledger.mjs";

const staging="postgres://staginguser:secret@isolated-staging.example:5432/scotty_staging";
const prod="postgres://produser:secret@production-db.example:5432/scotty_production";
test("A0 staging isolation guard rejects production hostname even with different user and db",()=>{
 assert.equal(isolateA0Database(staging,prod),true);
 assert.equal(isolateA0Database("postgres://otheruser:other@production-db.example:5433/another_db",prod),false);
 assert.equal(isolateA0Database("postgresql://otheruser:other@PRODUCTION-DB.EXAMPLE/another_db",prod),false);
 assert.equal(isolateA0Database(prod,prod),false);
});
test("A0 refuses invalid connection references without exposing credentials",()=>{
 assert.equal(isolateA0Database("",""),false);
 assert.equal(isolateA0Database("https://staging.example/scotty",prod),false);
 assert.equal(isolateA0Database("postgres://staging.example/scotty",prod),false);
 assert.equal(isolateA0Database(staging,"not a url"),false);
});
test("No production URL requires a separate resource inventory, not automatic certification",()=>{
 assert.equal(isolateA0Database(staging,undefined),true);
 // is a syntactic guard only; service identity still needs human review.
});
