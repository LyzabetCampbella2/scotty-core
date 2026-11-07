/**
 * Stage A / Phase 0: last-resort ingress lock for unverified executors.
 *
 * Intentionally has NO enable flag. A0's ledger and owner session are not
 * connected to actual agent/workspace/provider executor boundaries yet.
 * Remove/replace this explicit lock only in a separately reviewed PR with
 * authenticated, scoped, transactional enforcement + emergency stop receipts.
 *
 * This protects the modular Bun HTTP entrypoint in the development branch.
 * It does not stop legacy Render/Railway code, Activepieces or direct imports.
 */
const prefixes = Object.freeze([
  "/api/agents", "/api/workspace", "/api/eyes", "/api/voice", "/api/memory"
]);
const safeDiagnosticGets = new Set([
  "/api/eyes/status", "/api/eyes/test", "/api/voice/status", "/api/memory/status"
]);

function matchesPrefix(path, prefix) {
  return path===prefix || path.startsWith(prefix + "/");
}

/**
 * @returns {Response|null} Response means deny; null means route through.
 */
export function checkA0ExecutionLock(req, url) {
  const path=url.pathname;
  if (!prefixes.some(prefix=>matchesPrefix(path,prefix))) return null;
  if (req.method==="GET" && safeDiagnosticGets.has(path)) return null;
  return Response.json(
    {ok:false,code:"A0_EXECUTOR_LOCK",error:"SCOTTY operational permissions not certified; request disabled"},
    {status:503,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}}
  );
}
