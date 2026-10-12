import { reliability } from './core';
import { actionGate, type ProposedAction } from './actions';
const key = process.env.SCOTTY_CONTROL_KEY;
function authorized(req: Request) {
  const supplied = req.headers.get('authorization');
  return Boolean(key && supplied === 'Bearer ' + key);
}
export async function handleReliability(req: Request, url: URL): Promise<Response> {
  if (!authorized(req)) return Response.json({error:'Unauthorized'}, {status:401});
  if (req.method === 'GET' && url.pathname === '/api/control/health') return Response.json(reliability.snapshot(), {headers:{'Cache-Control':'no-store'}});
  if (req.method !== 'POST') return Response.json({error:'Not found'}, {status:404});
  if (url.pathname === '/api/control/stop') { reliability.emergencyStop(); return Response.json({stopped:true}); }
  if (url.pathname === '/api/control/resume') { reliability.resume(); return Response.json({stopped:false}); }
  if (url.pathname === '/api/control/approve') {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.actionId !== 'string' || body.actionId.length > 200 || body.approved !== true || !Number.isFinite(body.expiresAt) || body.expiresAt <= Date.now() || body.expiresAt > Date.now() + 300000) return Response.json({error:'Invalid approval'}, {status:400});
    actionGate.approve({actionId:body.actionId,approved:true,approvedBy:'control-owner',expiresAt:body.expiresAt});
    return Response.json({approved:true});
  }
  return Response.json({error:'Not found'}, {status:404});
}
export async function runApprovedAction<T>(action: ProposedAction, execute: () => Promise<T>): Promise<T> {
  return actionGate.execute(action, execute);
}
