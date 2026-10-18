// Serialize project authorization changes and deliveries in one transaction.
// All callers must hold this lock until their PostgreSQL transaction commits.
export async function lockCollaborationProject(q:any, projectId:string){
 await q`select pg_advisory_xact_lock(hashtext('scotty-collaboration'),hashtext(${projectId}))`;
}
