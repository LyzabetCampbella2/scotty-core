export const workStatuses=['requested','accepted_for_work','in_progress','ready_for_acceptance','accepted','closed','blocked','changes_requested'] as const;
export function field(value:unknown,label:string,max=4000,optional=false){if(typeof value!=='string'||value.trim().length>max||(!optional&&!value.trim()))throw Error('Provide '+label+' (up to '+max+' characters)');return value.trim();}
export function reference(value:unknown,optional=true){const s=field(value??'','a reference URL',1500,optional);if(!s)return '';let u:URL;try{u=new URL(s);}catch{throw Error('Reference must be an HTTP or HTTPS URL');}if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Reference must be an HTTP or HTTPS URL without credentials');return u.href;}
export function date(value:unknown,optional=false){const s=field(value??'','a date in YYYY-MM-DD format',10,optional);if(!s&&optional)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)throw Error('Use a real date in YYYY-MM-DD format');return s;}
export function requestSpec(b:any){
 if(!b||typeof b!=='object')throw Error('Provide request details');
 const required=['title','requester','receivingTeam','businessNeed','outcome','inScope','outOfScope','deliverables','acceptanceOwner'];const result:any={};
 for(const key of required)result[key]=field(b[key],key,key==='title'?180:4000);
 if(!Array.isArray(b.acceptanceCriteria)||b.acceptanceCriteria.length<1||b.acceptanceCriteria.length>20)throw Error('Provide 1–20 measurable acceptance criteria');
 result.acceptanceCriteria=b.acceptanceCriteria.map((c:any,i:number)=>({id:'AC-'+String(i+1).padStart(2,'0'),result:field(c.result,'criterion result',2000),method:field(c.method,'verification method',2000)}));
 for(const key of ['deliveryOwner','releaseAuthority','maintenanceOwner','dependencies','accessRequired','priorityRationale','fixedDeadlineReason','risks'])result[key]=field(b[key]??'',key,3000,true);
 result.priority=field(b.priority??'normal','priority',20);if(!['low','normal','high','urgent'].includes(result.priority))throw Error('Choose low, normal, high or urgent priority');
 result.requestedDate=date(b.requestedDate);result.fixedDeadline=date(b.fixedDeadline,true);if(result.fixedDeadline&&!result.fixedDeadlineReason)throw Error('Explain the fixed deadline');
 if(!Array.isArray(b.affectedSystems??[])||(b.affectedSystems??[]).length>20)throw Error('List up to 20 affected systems');
 result.affectedSystems=(b.affectedSystems??[]).map((x:any)=>({name:field(x.name,'system name',180),owner:field(x.owner??'','system owner',180,true)}));
 result.devRecordUrl=reference(b.devRecordUrl);return result;
}
export function teamResponse(b:any){
 if(!['accept','needs_clarification','propose_changes','decline'].includes(b?.disposition))throw Error('Choose a receiving-team response');
 const r:any={disposition:b.disposition,respondent:field(b.respondent,'respondent name',180),note:field(b.note,'response note'),reference:reference(b.reference,false),responseDate:date(b.responseDate),recordedBy:'owner',provenance:'manual_owner_record',identityVerified:false};
 for(const k of ['deliveryOwner','estimate','assumptions','openQuestions'])r[k]=field(b[k]??'',k,3000,b.disposition!=='accept'||k==='assumptions'||k==='openQuestions');
 r.committedDate=date(b.committedDate,b.disposition!=='accept');
 if(b.reviewed!==true)throw Error('Confirm that you reviewed the receiving-team response');return r;
}
export function requesterAgreement(b:any){if(b?.approved!==true)throw Error('Explicit requester agreement is required');return {person:field(b.person,'requester agreement name',180),note:field(b.note,'agreement note'),reference:reference(b.reference,false),agreementDate:date(b.agreementDate),recordedBy:'owner',provenance:'manual_owner_record',identityVerified:false};}
export function version(value:any){if(!Number.isSafeInteger(value)||value<1)throw Error('Provide the version you reviewed');return value;}
export function commandId(value:any){if(typeof value!=='string'||!/^\b[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b$/i.test(value))throw Error('A unique command ID is required');return value;}
export async function fingerprint(value:any){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(x=>x.toString(16).padStart(2,'0')).join('');}
