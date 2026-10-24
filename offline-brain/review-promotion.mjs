/**
 * Explicit OWNER REVIEW bridge from public discovery to validated offline knowledge.
 * Never downloads the linked article, generates its content, trains a model,
 * shares to clients, or writes to any production resource.
 */
import {PUBLIC_FEEDS} from "./update-sources.mjs";
import {createOfflineBrain} from "./engine.mjs";
import {DEPARTMENTS,buildSyntheticRoster} from "./catalog.mjs";

const validId=/^[a-z0-9._:-]{1,160}$/i;
function approvedPublisher(article) {
 const feed=PUBLIC_FEEDS.find(s=>s.id===article?.sourceId);
 if(!feed||article.status!=="pending-review"||article.verifiedFact!==false)return null;
 try{
  const url=new URL(article.url);
  if(url.protocol!=="https:"||url.username||url.password||url.port||!(url.hostname===feed.publisherDomain||url.hostname.endsWith("."+feed.publisherDomain)))return null;
 }catch{return null;}
 return feed;
}
export function prepareReviewedKnowledge(snapshot,decisions,{approvedBy,approvedAt=new Date().toISOString()}={}){
 if(!snapshot||snapshot.kind!=="PUBLIC_SOURCE_DISCOVERIES_ONLY"||!Array.isArray(snapshot.records))throw Error("Public discovery snapshot required");
 if(!Array.isArray(decisions)||decisions.length>80||!decisions.length)throw Error("At least one explicit review decision required");
 if(typeof approvedBy!=="string"||!validId.test(approvedBy)||!Number.isFinite(Date.parse(approvedAt)))throw Error("Named reviewer and date required");
 const docs=[],roster=buildSyntheticRoster(),seen=new Set();
 for(const choice of decisions){
  if(choice?.decision!=="approve"||choice?.reviewed!==true)throw Error("Explicit human source review approval is required");
  const article=snapshot.records.find(r=>r.id===choice.discoveryId);
  const feed=approvedPublisher(article);
  if(!article||!feed||seen.has(article.id))throw Error("Unapproved, invalid or duplicate source discovery");
  seen.add(article.id);
  const department=String(choice.department||"");
  if(!DEPARTMENTS.some(d=>d.name===department)||!article.departments.includes(department))throw Error("Department must match publisher source policy");
  const text=String(choice.reviewedNotes??"").trim();
  if(text.length<50||text.length>8000)throw Error("Review must contain 50-8000 characters of human-checked notes");
  const recipients=choice.allowedAgentIds??[];
  if(!Array.isArray(recipients)||recipients.length>128||recipients.some(id=>typeof id!=="string"||!roster.some(a=>a.id===id&&a.department===department))||new Set(recipients).size!==recipients.length)throw Error("Recipients must be agents within the approved department");
  docs.push({
   id:"reviewed-"+article.id+"-"+DEPARTMENTS.find(d=>d.name===department).slug,
   title:"Reviewed reference: "+String(article.title).slice(0,180),
   content:"Owner-reviewed summary (NOT original article):\n"+text+
    "\nSource publication: "+(article.publishedAt||"unknown")+
    "\nApproved by: "+approvedBy+
    "\nNote: reviewer has verified the summary; investigate any material uncertainty before consequential use.",
   scope:"department",department,allowedAgentIds:recipients,
   sourceType:"public-reference",
   citation:article.publisher+" — "+article.title+"; "+article.url,
   url:article.url,reviewedAt:approvedAt,approved:true
  });
 }
 return Object.freeze({status:"OWNER_REVIEWED_OFFLINE_DOCUMENTS",documents:docs,providerCalls:0,productionWrites:0});
}
export function createBrainFromReviews(snapshot,decisions,approval){
 const pack=prepareReviewedKnowledge(snapshot,decisions,approval);
 return createOfflineBrain({documents:pack.documents});
}
