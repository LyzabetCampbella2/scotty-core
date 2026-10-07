// Shared-memory boundary for S.C.O.T.T.Y., chiefs and agents.
export async function handleMemory(req:Request,u:URL){
 if(req.method==="GET"&&u.pathname==="/api/memory/status") return Response.json({ok:true,feature:"memory",databaseConfigured:Boolean(process.env.DATABASE_URL)});
 return Response.json({ok:false,message:"Memory compatibility adapter is being migrated from the legacy runtime."},{status:501});
}