// Eyes On is isolated here so vision can be patched without replacing S.C.O.T.T.Y.'s whole application.
export async function handleEyesOn(req:Request,u:URL){
 if(req.method==="GET"&&u.pathname==="/api/eyes/status") return Response.json({ok:true,feature:"eyes-on",ready:true});
 return Response.json({ok:false,feature:"eyes-on",message:"Eyes On compatibility adapter is being migrated from the legacy runtime."},{status:501});
}