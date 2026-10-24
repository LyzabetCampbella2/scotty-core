import test from "node:test";
import assert from "node:assert/strict";
import {parsePublicFeed} from "./refresh-public.mjs";
import {PUBLIC_FEEDS} from "./update-sources.mjs";
import {prepareReviewedKnowledge,createBrainFromReviews} from "./review-promotion.mjs";
const f=PUBLIC_FEEDS.find(s=>s.id==="nist-security");
const xml='<rss><channel><item><title>Evidence briefing</title><link>https://www.nist.gov/news-events/example</link><pubDate>Fri, 23 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>';
const records=parsePublicFeed(xml,f);
const snapshot={kind:"PUBLIC_SOURCE_DISCOVERIES_ONLY",records};
const reviewedNotes="QUARTZWORD is synthetic and used only to check that explicitly approved technical knowledge remains department scoped and not shared by accident.";
const approved={decision:"approve",reviewed:true,discoveryId:records[0].id,department:"Security & Defense",reviewedNotes};
test("automatic public discovery never promotes itself",()=>{
 assert.throws(()=>prepareReviewedKnowledge(snapshot,[],{approvedBy:"owner"}),/decision/);
 assert.throws(()=>prepareReviewedKnowledge(snapshot,[{...approved,reviewed:false}],{approvedBy:"owner"}),/human/);
 assert.throws(()=>prepareReviewedKnowledge(snapshot,[{...approved,department:"Creative & Knowledge"}],{approvedBy:"owner"}),/Department/);
});
test("owner-reviewed department note is usable only by its specialists",()=>{
 const p=prepareReviewedKnowledge(snapshot,[approved],{approvedBy:"owner",approvedAt:"2026-10-24"});
 assert.equal(p.documents.length,1);assert.equal(p.documents[0].scope,"department");
 assert.equal(p.documents[0].approved,true);assert.equal(p.providerCalls,0);
 const brain=createBrainFromReviews(snapshot,[approved],{approvedBy:"owner",approvedAt:"2026-10-24"});
 assert.ok(brain.search("chief-worf","QUARTZWORD").results.some(r=>r.sourceId===p.documents[0].id));
 assert.ok(!brain.search("chief-zora","QUARTZWORD").results.some(r=>r.sourceId===p.documents[0].id));
});
test("disallow out-of-department recipients",()=>{
 assert.throws(()=>prepareReviewedKnowledge(snapshot,[{...approved,allowedAgentIds:["chief-zora"]}],{approvedBy:"owner"}),/Recipients/);
});
test("refuse fake source records, duplicated approvals and overly short reviews",()=>{
 assert.throws(()=>prepareReviewedKnowledge(snapshot,[{...approved,discoveryId:"unknown"}],{approvedBy:"owner"}),/Unapproved/);
 assert.throws(()=>prepareReviewedKnowledge(snapshot,[approved,approved],{approvedBy:"owner"}),/duplicate/);
 assert.throws(()=>prepareReviewedKnowledge(snapshot,[{...approved,reviewedNotes:"trusted"}],{approvedBy:"owner"}),/50-8000/);
});
