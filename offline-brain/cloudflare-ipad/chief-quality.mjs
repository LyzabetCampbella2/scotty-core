/** Advisory chief-of-staff review; never claims source verification or external execution. */
const has=(x,re)=>re.test(String(x||''));
export function evaluateTeamDeliverable({question='',results=[],answer='',references=[]}={}){
 const flags=[],out=String(answer||'').trim();
 const chiefs=(results||[]).filter(x=>x.role==='department chief'),specialists=(results||[]).filter(x=>x.role==='specialist'),scotty=(results||[]).filter(x=>x.role==='overseer');
 if(!out)flags.push({code:'NO_DELIVERABLE',severity:'blocking',reason:'SCOTTY did not provide a final deliverable.'});
 if(!specialists.length)flags.push({code:'NO_SPECIALIST',severity:'blocking',reason:'No specialist output was recorded.'});
 if(!chiefs.length)flags.push({code:'NO_CHIEF',severity:'blocking',reason:'The requested chief review was not recorded.'});
 if(!scotty.length)flags.push({code:'NO_SYNTHESIS',severity:'blocking',reason:'No final SCOTTY synthesis was recorded.'});
 if(out&&out.length<70)flags.push({code:'VERY_SHORT',severity:'review',reason:'Verify that the answer is substantial enough to meet the assignment.'});
 if(has(out,/\b(?:i (?:deployed|emailed|purchased|created a calendar event)|database (?:was|is) updated|payment (?:was|is) made)\b/i))
  flags.push({code:'EXECUTION_CLAIM',severity:'review',reason:'External action claimed; tool evidence and independent readback are required.'});
 if(has(question,/\b(?:today|latest|current|this week|this month|as of)\b/i)&&!(references||[]).length)
  flags.push({code:'FRESHNESS_UNSOURCED',severity:'review',reason:'Time-sensitive requested information lacks dated source records.'});
 const requested=String(question||'').match(/\b(?:list|provide|give|write|include|produce|create|draft)\s+(\d{1,2})\s+(?:items?|examples?|tests?|cases?|steps?|options?|questions?|ideas?)/i);
 if(requested){
  const n=Number(requested[1]),found=(out.match(/(?:^|\n)\s*(?:\d+[.)]|[-*] )/g)||[]).length;
  if(n<=20&&found<n)flags.push({code:'ITEM_COUNT_UNCERTAIN',severity:'review',reason:'Requested '+n+' entries but only '+found+' clearly enumerated; count manually.'});
 }
 for(const r of chiefs){
  if(!String(r.text||'').trim())flags.push({code:'EMPTY_CHIEF_REVIEW',severity:'blocking',reason:'A chief returned no substantive written review.'});
 }
 const blocking=flags.some(f=>f.severity==='blocking');
 return {providerPipelineFinished:!!out&&specialists.length>0&&chiefs.length>0&&scotty.length>0,
  reviewer:'department chiefs then SCOTTY then owner',
  deliverableStatus:blocking?'incomplete':'owner-review-required',
  qualitySignals:flags,accuracy:'not-independently-verified',complete:false,ownerAccepted:false,
  reviewChecklist:['Does the answer satisfy the original deliverable and requested count?',
   'Are material claims supported by authorized source IDs and dates?',
   'Are assumptions and unresolved problems clearly identified?',
   'Did a chief actually correct errors rather than repeat the specialist?',
   'Can any claimed external execution be independently verified?'],
  limitation:'These are deterministic warning signals, not a semantic accuracy score.'};
}
